use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::get_first_item_from_stream_in_result_in_future;

#[derive(Clone)]
pub struct UserHidden {
    id: ID,
    email: String,
    //providerData: serde_json::Value,
    providerData: String,
    backgroundID: Option<String>,
    backgroundCustom_enabled: Option<bool>,
    backgroundCustom_color: Option<String>,
    backgroundCustom_url: Option<String>,
    backgroundCustom_position: Option<String>,
    addToStream: bool,
    lastAccessPolicy: Option<String>,
    //extras: serde_json::Value,
    extras: String,
}
impl From<tokio_postgres::row::Row> for UserHidden {
	fn from(row: tokio_postgres::row::Row) -> Self {
        println!("ID as string:{}", row.get::<_, String>("id"));
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            email: row.get("email"),
            //providerData: serde_json::from_value(row.get("providerData")).unwrap(),
            providerData: "{}".to_owned(),
            backgroundID: row.get("backgroundID"),
            backgroundCustom_enabled: row.get("backgroundCustom_enabled"),
            backgroundCustom_color: row.get("backgroundCustom_color"),
            backgroundCustom_url: row.get("backgroundCustom_url"),
            backgroundCustom_position: row.get("backgroundCustom_position"),
            addToStream: row.get("addToStream"),
            lastAccessPolicy: row.get("lastAccessPolicy"),
            //extras: serde_json::from_value(row.get("extras")).unwrap(),
            extras: "{}".to_owned(),
		}
	}
}
#[Object]
impl UserHidden {
    async fn id(&self) -> &str { &self.id }
    async fn email(&self) -> &str { &self.email }
    //async fn providerData(&self) -> &serde_json::Value { &self.providerData }
    async fn providerData(&self) -> &str { &self.providerData }
    async fn backgroundID(&self) -> &Option<String> { &self.backgroundID }
    #[graphql(name = "backgroundCustom_enabled")]
    async fn backgroundCustom_enabled(&self) -> &Option<bool> { &self.backgroundCustom_enabled }
    #[graphql(name = "backgroundCustom_color")]
    async fn backgroundCustom_color(&self) -> &Option<String> { &self.backgroundCustom_color }
    #[graphql(name = "backgroundCustom_url")]
    async fn backgroundCustom_url(&self) -> &Option<String> { &self.backgroundCustom_url }
    #[graphql(name = "backgroundCustom_position")]
    async fn backgroundCustom_position(&self) -> &Option<String> { &self.backgroundCustom_position }
    async fn addToStream(&self) -> &bool { &self.addToStream }
    async fn lastAccessPolicy(&self) -> &Option<String> { &self.lastAccessPolicy }
    //async fn extras(&self) -> &serde_json::Value { &self.extras }
    async fn extras(&self) -> &str { &self.extras }
}
//type UserHidden = String;

/*#[derive(Default)]
pub struct QueryShard_UserHiddens;
#[Object]
impl QueryShard_UserHiddens {
    async fn empty(&self) -> &str { &"" }
}*/

/*#[derive(Default)]
pub struct MutationShard_UserHiddens;
#[Object]
impl MutationShard_UserHiddens {
    async fn empty(&self) -> &str { &"" }
}*/

pub struct CollectionWrapper2<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> CollectionWrapper2<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_UserHiddens;
#[Subscription]
impl SubscriptionShard_UserHiddens {
    async fn userHiddens(&self, ctx: &Context<'_>, id: Option<String>) -> impl Stream<Item = CollectionWrapper2<UserHidden>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"userHiddens\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"userHiddens\";", &[]).await.unwrap(),
        };
        let userHiddens: Vec<UserHidden> = rows.into_iter().map(|r| r.into()).collect();
        println!("UserHiddens:{:?}", userHiddens.len());
        //let userHiddens: Vec<UserHidden> = vec!["hi".to_string()];

        stream::once(async {
            CollectionWrapper2 {
                nodes: userHiddens, 
            }
        })
    }
    async fn userHidden(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = UserHidden> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.userHiddens(ctx, Some(id))).await;
        let entry = wrapper.nodes.pop().unwrap();
        stream::once(async { entry })
    }
}