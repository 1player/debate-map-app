use indexmap::IndexMap;
use itertools::Itertools;
use jsonschema::JSONSchema;
use jsonschema::output::BasicOutput;
use lazy_static::lazy_static;
use rust_shared::{async_graphql, serde, serde_json};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Context, Error};
use rust_shared::async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use deadpool_postgres::{Pool, Client, Transaction};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future, TryStreamExt};
use hyper::{Body, Method};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::{time_since_epoch_ms, time_since_epoch_ms_i64};
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio::sync::RwLock;
use rust_shared::tokio_postgres::Row;
use rust_shared::tokio_postgres::types::ToSql;
use rust_shared::utils::db_constants::{SYSTEM_USER_ID};
use tracing::info;
use std::collections::HashSet;
use std::path::Path;
use std::rc::Rc;
use std::sync::Arc;
use std::{time::Duration, pin::Pin, task::Poll};

use crate::db::_general::GenericMutation_Result;
use crate::db::access_policies::AccessPolicy;
use crate::db::general::subtree_collector::get_node_subtree;
use crate::db::medias::Media;
use crate::db::node_child_links::{NodeChildLink, get_node_child_links};
use crate::db::node_phrasings::MapNodePhrasing;
use crate::db::node_tags::{MapNodeTag, TagComp_CloneHistory};
use crate::db::nodes::MapNode;
use crate::db::terms::Term;
use crate::links::proxy_to_asjs::{HyperClient, APP_SERVER_JS_URL};
use crate::utils::db::accessors::AccessorContext;
use crate::utils::db::filter::{QueryFilter, FilterInput};
use crate::utils::type_aliases::RowData;
use crate::utils::db::sql_fragment::SQLFragment;
use crate::utils::db::transactions::{start_read_transaction, start_write_transaction};
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1, DataAnchor};
use crate::utils::general::general::{to_anyhow, to_anyhow_with_extra};
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}}};
use crate::utils::type_aliases::{PGClientObject};

use super::_command::{set_db_entry_by_id, set_db_entry_by_id_for_struct};

//wrap_slow_macros!{}

#[derive(Serialize, Deserialize, Debug)] //#[serde(crate = "rust_shared::serde")]
pub struct CloneSubtreePayload {
    parentNodeID: String,
    rootNodeID: String,
    maxDepth: usize,
}
lazy_static! {
    static ref CLONE_SUBTREE_PAYLOAD_SCHEMA_JSON: JSONValue = json!({
        "properties": {
            "parentNodeID": {"type": "string"},
            "rootNodeID": {"type": "string"},
            "maxDepth": {"type": "number"},
        },
        "required": ["parentNodeID", "rootNodeID", "maxDepth"],
    });
    static ref CLONE_SUBTREE_PAYLOAD_SCHEMA_JSON_COMPILED: JSONSchema = JSONSchema::compile(&CLONE_SUBTREE_PAYLOAD_SCHEMA_JSON).expect("A valid schema");
}

pub async fn clone_subtree(gql_ctx: &async_graphql::Context<'_>, payload_raw: JSONValue) -> Result<GenericMutation_Result, Error> {
    let output: BasicOutput = CLONE_SUBTREE_PAYLOAD_SCHEMA_JSON_COMPILED.apply(&payload_raw).basic();
    if !output.is_valid() {
        let output_json = serde_json::to_value(output)?;
        return Err(anyhow!(output_json));
    }
    let payload: CloneSubtreePayload = serde_json::from_value(payload_raw)?;
    
    let mut anchor = DataAnchorFor1::empty(); // holds pg-client
    let ctx = AccessorContext::new_write(&mut anchor, gql_ctx).await?;

    // probably temp: helper for logging
    let log = |text: &str| {
        info!("CloneSubtreeLog: {text}");
        //msg_sender.send(GeneralMessage::MigrateLogMessageAdded(text.to_owned())).unwrap();
    };

    log("part 0");
    let subtree = get_node_subtree(&ctx, payload.rootNodeID.clone(), payload.maxDepth).await?;
    // these don't need cloning (since they don't "reference back"): terms, medias

    log("part 0.5");
    let ids = subtree.get_all_ids();
    let mut id_replacements: IndexMap<String, String> = IndexMap::new();
    for id in &ids {
        id_replacements.insert(id.clone(), new_uuid_v4_as_b64());
    }
    let get_new_id_str = |old_id: &String| id_replacements.get(old_id).unwrap().to_owned();
    let get_new_id = |old_id: &ID| ID(get_new_id_str(&old_id.to_string()));

    log("part 0.75");
	// defer database's checking of foreign-key constraints until the end of the transaction (else would error)
    ctx.tx.execute("SET CONSTRAINTS ALL DEFERRED;", &[]).await?;

    // todo: make-so these new entries all have their "creator" field updated to the actual user that's doing the cloning
    //let actor_id = SYSTEM_USER_ID.to_owned();
    let actor_id = || SYSTEM_USER_ID.to_owned();

    log("part 1");
    // first, add a new link from the old-node's parent to the new-node (which we've generated an id for, and are about to construct)
    let old_root_links = get_node_child_links(&ctx, Some(payload.parentNodeID.as_str()), Some(payload.rootNodeID.as_str())).await?;
    let old_root_link = old_root_links.get(0).ok_or(anyhow!("No child-link found between provided root-node \"{}\" and parent \"{}\".", payload.rootNodeID, payload.parentNodeID))?;
    let mut new_root_link = old_root_link.clone();
    new_root_link.id = ID(new_uuid_v4_as_b64());
    new_root_link.creator = actor_id();
    new_root_link.createdAt = time_since_epoch_ms_i64();
    //new_root_link.child = id_replacements.get(&payload.rootNodeID).ok_or(anyhow!("Generation of new id for clone of root-node failed somehow."))?.to_owned();
    new_root_link.child = get_new_id_str(&payload.rootNodeID);
    log("part 1.5");
    set_db_entry_by_id_for_struct(&ctx, "nodeChildLinks".to_owned(), new_root_link.id.to_string(), new_root_link).await?;

    log("part 2");
    //let mut nodes_needing_clone_history_tag: HashSet<String> = HashSet::new();
    let mut nodes_still_needing_clone_history_tag: Vec<String> = vec![];
    for node_old in subtree.nodes {
        //nodes_needing_clone_history_tag.insert(node_old.id.to_string());
        nodes_still_needing_clone_history_tag.push(node_old.id.to_string());
        let mut node = node_old.clone();
        node.id = get_new_id(&node.id);
        node.creator = actor_id();
        node.createdAt = time_since_epoch_ms_i64();
        node.c_currentRevision = get_new_id_str(&node.c_currentRevision);
        set_db_entry_by_id_for_struct(&ctx, "nodes".to_owned(), node.id.to_string(), node).await?;
    }
    log("part 3");
    for rev_old in subtree.nodeRevisions {
        let mut rev = rev_old.clone();
        rev.id = get_new_id(&rev.id);
        rev.creator = actor_id();
        rev.createdAt = time_since_epoch_ms_i64();
        /*for attachment in &rev.attachments {
            if let Some(media) = attachment.media {
            }
        }*/
        rev.node = get_new_id_str(&rev.node);
        set_db_entry_by_id_for_struct(&ctx, "nodeRevisions".to_owned(), rev.id.to_string(), rev).await?;
    }
    log("part 4");
    for phrasing_old in subtree.nodePhrasings {
        let mut phrasing = phrasing_old.clone();
        phrasing.id = get_new_id(&phrasing.id);
        phrasing.creator = actor_id();
        phrasing.createdAt = time_since_epoch_ms_i64();
        phrasing.node = get_new_id_str(&phrasing.node);
        set_db_entry_by_id_for_struct(&ctx, "nodePhrasings".to_owned(), phrasing.id.to_string(), phrasing).await?;
    }
    log("part 5");
    for link_old in subtree.nodeChildLinks {
        let mut link = link_old.clone();
        link.id = get_new_id(&link.id);
        link.creator = actor_id();
        link.createdAt = time_since_epoch_ms_i64();
        link.parent = get_new_id_str(&link.parent);
        link.child = get_new_id_str(&link.child);
        set_db_entry_by_id_for_struct(&ctx, "nodeChildLinks".to_owned(), link.id.to_string(), link).await?;
    }
    log("part 6");
    for tag_old in subtree.nodeTags {
        let mut tag = tag_old.clone();
        tag.id = get_new_id(&tag.id);
        tag.creator = actor_id();
        tag.createdAt = time_since_epoch_ms_i64();

        // todo: recreate the CalculateNodeIDsForTag function, so we don't need manual updating of the "nodes" field

        // for now, only transfer tags in the "basics" group like labels, and special-cases like clone-history tags (see MaybeCloneAndRetargetNodeTag func)
        if let Some(mut labels) = tag.labels.as_mut() {
            let old_nodeX_id = labels.nodeX.clone();
            labels.nodeX = get_new_id_str(&labels.nodeX);
            tag.nodes = tag.nodes.into_iter().map(|node_id| if node_id == old_nodeX_id { labels.nodeX.clone() } else { node_id }).collect_vec();
        }
        // clone-history tags are a special case: clone+extend them if-and-only-if the result/final-entry is the old-node (preserving history without creating confusion)
        if let Some(clone_history) = tag.cloneHistory.as_mut() {
            let last_node_in_history = clone_history.cloneChain.last();
            if let Some(last_node_in_history) = last_node_in_history && ids.contains(last_node_in_history) {
                let last_node_in_history_clone = last_node_in_history.clone();
                //let new_node_id = id_replacements.get(last_node_in_history).unwrap().to_owned();
                let new_node_id = get_new_id_str(last_node_in_history);
                clone_history.cloneChain.push(new_node_id.clone());
                tag.nodes.push(new_node_id);
                //nodes_needing_clone_history_tag.remove(&last_node_in_history);
                nodes_still_needing_clone_history_tag.retain(|a| *a != last_node_in_history_clone);
            } else {
                // this tag marks the old-node merely as the source for a clone, which shouldn't transfer to new node, so skip this tag (ie. don't clone it)
                continue;
            }
        }

        set_db_entry_by_id_for_struct(&ctx, "nodeTags".to_owned(), tag.id.to_string(), tag).await?;
    }
    log("part 6.5");
    for old_node_id in nodes_still_needing_clone_history_tag {
        let tag = MapNodeTag {
            id: ID(new_uuid_v4_as_b64()),
            creator: actor_id(),
            createdAt: time_since_epoch_ms_i64(),
            nodes: vec![old_node_id.clone(), get_new_id_str(&old_node_id)],
            cloneHistory: Some(TagComp_CloneHistory {
                cloneChain: vec![old_node_id.clone(), get_new_id_str(&old_node_id)],
            }),
            labels: None,
            mirrorChildrenFromXToY: None,
            mutuallyExclusiveGroup: None,
            restrictMirroringOfX: None,
            xIsExtendedByY: None,
        };
        set_db_entry_by_id_for_struct(&ctx, "nodeTags".to_owned(), tag.id.to_string(), tag).await?;
        //nodes_needing_clone_history_tag.retain(|a| *a != old_node_id);
    }
    //nodes_still_needing_clone_history_tag.clear(); // commented; not needed, since contents already moved out of vector

    log("Committing transaction...");
    ctx.tx.commit().await?;
    log("Clone-subtree command complete!");
    Ok(GenericMutation_Result {
        message: "Command completed successfully.".to_owned(),
    })
}