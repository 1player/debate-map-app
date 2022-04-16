use axum::{
    response::{Html},
    routing::{get, any_service, post, get_service},
    AddExtensionLayer, Router, http::{
        Method,
        header::{CONTENT_TYPE}
    },
    headers::HeaderName, middleware, body::{BoxBody, boxed}, extract::{Extension, ConnectInfo}, Json,
};
use hyper::{server::conn::AddrStream, service::{make_service_fn, service_fn}, Request, Body, Response, StatusCode, header::{FORWARDED, self}, Uri};
use rust_macros::wrap_slow_macros;
use serde::Deserialize;
use serde_json::json;
use tower::ServiceExt;
use tower_http::{cors::{CorsLayer, Origin, AnyOr}, services::ServeFile};
use tracing::{error, info};
use std::{
    collections::HashSet,
    net::{SocketAddr, IpAddr},
    sync::{Arc}, panic, backtrace::Backtrace, convert::Infallible, str::FromStr,
};
use tokio::{sync::{broadcast, Mutex}, runtime::Runtime};
use flume::{Sender, Receiver, unbounded};
use tower_http::{services::ServeDir};

use crate::{store::storage::{AppState, AppStateWrapper, Mtx}};

wrap_slow_macros!{

#[derive(Deserialize)]
pub struct SendMtxResults_Request {
    mtx: Mtx,
}

}

pub async fn send_mtx_results(
    Extension(app_state): Extension<AppStateWrapper>, ConnectInfo(addr): ConnectInfo<SocketAddr>,
    //req: Request<Body>
    Json(payload): Json<SendMtxResults_Request>
) -> Response<Body> {
    let caller_is_pod = addr.ip().is_ipv4() && addr.ip().to_string().starts_with("10.");
    if !caller_is_pod {
        error!("/send-mtx-results endpoint was called, but the caller was not an in-cluster pod! @callerIP:{}", addr.ip());
        let json = json!({"error": format!("This endpoint is only meant to be used for in-cluster callers (ie. pods) atm.")});
        return Response::builder().status(StatusCode::BAD_GATEWAY)
            .body(Body::from(json.to_string())).unwrap()
    }

    let SendMtxResults_Request { mtx } = payload;
    info!("Got mtx-result:{}", serde_json::to_string_pretty(&mtx).unwrap());

    let mut mtx_results = app_state.mtx_results.write().await;
    if let Some(existing_entry) = mtx_results.iter().enumerate().find(|(_, entry)| entry.id == mtx.id) {
        let index = existing_entry.0;
        mtx_results.remove(index);
    }

    mtx_results.push(mtx);
    if mtx_results.len() > 5000 {
        let entries_to_remove = mtx_results.len() - 5000;
        mtx_results.drain(0..entries_to_remove);
    }
    
    let json = json!({
        "message": format!("Mtx-result successfully received."),
    });
    return Response::builder().status(StatusCode::BAD_GATEWAY)
        .body(Body::from(json.to_string())).unwrap()
}