use std::fmt::Write;
use std::sync::Arc;

use async_graphql::extensions::{
    Extension, ExtensionContext, ExtensionFactory, NextExecute, NextParseQuery, NextSubscribe,
};
use async_graphql::parser::types::{ExecutableDocument, OperationType, Selection};
use async_graphql::{PathSegment, Response, ServerResult, Variables};
use futures_util::stream::BoxStream;

/// Logger extension
#[cfg_attr(docsrs, doc(cfg(feature = "log")))]
pub struct CustomExtensionCreator;
impl CustomExtensionCreator {
    pub fn new() -> Self {
        Self {}
    }
}
impl ExtensionFactory for CustomExtensionCreator {
    fn create(&self) -> Arc<dyn Extension> {
        Arc::new(CustomExtension)
    }
}

pub struct CustomExtension;

#[async_trait::async_trait]
impl Extension for CustomExtension {
    async fn parse_query(
        &self,
        ctx: &ExtensionContext<'_>,
        query: &str,
        variables: &Variables,
        next: NextParseQuery<'_>,
    ) -> ServerResult<ExecutableDocument> {
        let document = next.run(ctx, query, variables).await?;
        let is_schema = document
            .operations
            .iter()
            .filter(|(_, operation)| operation.node.ty == OperationType::Query)
            .any(|(_, operation)| operation.node.selection_set.node.items.iter().any(|selection| matches!(&selection.node, Selection::Field(field) if field.node.name.node == "__schema")));
        if !is_schema {
            println!("[Execute] {}", ctx.stringify_execute_doc(&document, variables));
        }
        Ok(document)
    }

    /// Called at subscribe request.
    fn subscribe<'s>(
        &self,
        ctx: &ExtensionContext<'_>,
        stream: BoxStream<'s, Response>,
        next: NextSubscribe<'_>,
    ) -> BoxStream<'s, Response> {
        println!("[subscribe] {:?}", ctx.query_data.unwrap());
        next.run(ctx, stream)
    }

    async fn execute(
        &self,
        ctx: &ExtensionContext<'_>,
        operation_name: Option<&str>,
        next: NextExecute<'_>,
    ) -> Response {
        let resp = next.run(ctx, operation_name).await;
        if resp.is_err() {
            for err in &resp.errors {
                if !err.path.is_empty() {
                    let mut path = String::new();
                    for (idx, s) in err.path.iter().enumerate() {
                        if idx > 0 {
                            path.push('.');
                        }
                        match s {
                            PathSegment::Index(idx) => {
                                let _ = write!(&mut path, "{}", idx);
                            }
                            PathSegment::Field(name) => {
                                let _ = write!(&mut path, "{}", name);
                            }
                        }
                    }

                    println!("[Error] path={} message={}", path, err.message);
                } else {
                    println!("[Error] message={}", err.message);
                }
            }
        }
        resp
    }
}



struct DropListener;
impl DropListener {
    fn new() -> Self {
        Self {}
    }
}
impl Drop for DropListener {
    fn drop(&mut self) {
        println!("DropListener got dropped. @address:{:p}", self);
    }
}