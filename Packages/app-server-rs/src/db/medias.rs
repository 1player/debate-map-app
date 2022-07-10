use anyhow::Error;
use rust_shared::SubError;
use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio_postgres::{Client};

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

use crate::utils::db::accessors::{get_db_entry, AccessorContext};

pub async fn get_media(ctx: &AccessorContext<'_>, id: &str) -> Result<Media, Error> {
    get_db_entry(ctx, "medias", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Media {
    pub id: ID,
    pub accessPolicy: String,
	pub creator: String,
	pub createdAt: i64,
    pub name: String,
    pub r#type: String,
    pub url: String,
    pub description: String,
}
impl From<tokio_postgres::row::Row> for Media {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            accessPolicy: row.get("accessPolicy"),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            name: row.get("name"),
            r#type: row.get("type"),
            url: row.get("url"),
            description: row.get("description"),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_Media { nodes: Vec<Media> }
#[Object] impl GQLSet_Media { async fn nodes(&self) -> &Vec<Media> { &self.nodes } }
impl GQLSet<Media> for GQLSet_Media {
    fn from(entries: Vec<Media>) -> GQLSet_Media { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<Media> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_Media;
#[Subscription]
impl SubscriptionShard_Media {
    async fn medias<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Media, SubError>> + 'a {
        handle_generic_gql_collection_request::<Media, GQLSet_Media>(ctx, "medias", filter).await
    }
    async fn media<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Option<FilterInput>) -> impl Stream<Item = Result<Option<Media>, SubError>> + 'a {
        handle_generic_gql_doc_request::<Media>(ctx, "medias", id).await
    }
}

}