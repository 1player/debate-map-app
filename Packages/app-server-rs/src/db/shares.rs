use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use serde::Deserialize;
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};

#[derive(SimpleObject, Clone, Deserialize)]
pub struct Share {
    id: ID,
	creator: String,
	createdAt: i64,
    name: String,
    r#type: String,
	mapID: Option<String>,
	mapView: serde_json::Value,
}
impl From<tokio_postgres::row::Row> for Share {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            name: row.get("name"),
            r#type: row.get("type"),
            mapID: row.get("mapID"),
            mapView: serde_json::from_value(row.get("mapView")).unwrap(),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_Share { nodes: Vec<Share> }
#[Object] impl GQLSet_Share { async fn nodes(&self) -> &Vec<Share> { &self.nodes } }
impl GQLSet<Share> for GQLSet_Share {
    fn from(entries: Vec<Share>) -> GQLSet_Share { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<Share> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_Share;
#[Subscription]
impl SubscriptionShard_Share {
    async fn shares<'a>(&self, ctx: &'a Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_Share> + 'a {
        handle_generic_gql_collection_request::<Share, GQLSet_Share>(ctx, "shares", filter).await
    }
    async fn share<'a>(&self, ctx: &'a Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<Share>> + 'a {
        handle_generic_gql_doc_request::<Share>(ctx, "shares", id).await
    }
}