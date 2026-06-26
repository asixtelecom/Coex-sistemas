module.exports=[193695,(e,t,a)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},918622,(e,t,a)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},832319,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},556704,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},324725,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},270406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},648343,e=>{"use strict";var t=e.i(747909),a=e.i(174017),r=e.i(996250),s=e.i(759756),i=e.i(561916),n=e.i(174677),o=e.i(869741),l=e.i(316795),u=e.i(487718),d=e.i(995169),p=e.i(47587),c=e.i(666012),E=e.i(570101),T=e.i(626937),m=e.i(10372),x=e.i(193695);e.i(52474);var R=e.i(257297),A=e.i(89171);let h=(0,e.i(224389).createClient)("https://coexsistemas.techvoz.com.br",process.env.SUPABASE_SERVICE_ROLE_KEY),b=`
-- Create mailboxes table
CREATE TABLE IF NOT EXISTS public.mailboxes (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID NOT NULL,
  title TEXT NOT NULL,
  color TEXT DEFAULT '#2563eb',
  imap_authorized BOOLEAN DEFAULT false,
  smtp_authorized BOOLEAN DEFAULT false,
  imap_host TEXT,
  imap_port INTEGER,
  imap_username TEXT,
  imap_password TEXT,
  imap_ssl BOOLEAN DEFAULT true,
  imap_type TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password TEXT,
  smtp_ssl BOOLEAN DEFAULT true,
  signature TEXT,
  send_bcc_to TEXT,
  permitted_users TEXT,
  use_global_email BOOLEAN DEFAULT true,
  email_provider TEXT,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create mailbox_templates table
CREATE TABLE IF NOT EXISTS public.mailbox_templates (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  body TEXT,
  created_by UUID,
  is_public BOOLEAN DEFAULT true,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailbox_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.mailboxes;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.mailbox_templates;

-- Create policies
CREATE POLICY "Allow all for authenticated" ON public.mailboxes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON public.mailbox_templates
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mailboxes_account_id ON public.mailboxes(account_id);
CREATE INDEX IF NOT EXISTS idx_mailbox_templates_account_id ON public.mailbox_templates(account_id);
`;async function _(){try{let{data:e,error:t}=await h.from("mailboxes").select("id").limit(1);if(t&&"PGRST116"===t.code)return A.NextResponse.json({success:!1,message:"As tabelas não existem. Execute o SQL manualmente no Supabase.",sql:b},{status:400});let{data:a,error:r}=await h.from("mailbox_templates").select("id").limit(1);if(r&&"PGRST116"===r.code)return A.NextResponse.json({success:!1,message:"Tabela mailbox_templates não existe. Execute o SQL manualmente.",sql:b},{status:400});return A.NextResponse.json({success:!0,message:"Tabelas já existem!",mailboxesExists:!t,templatesExists:!r})}catch(e){return console.error("Error:",e),A.NextResponse.json({error:"Erro ao verificar tabelas",details:e instanceof Error?e.message:"Unknown error",sql:b},{status:500})}}e.s(["GET",0,_],524526);var v=e.i(524526);let N=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/create-email-tables/route",pathname:"/api/create-email-tables",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/create-email-tables/route.ts",nextConfigOutput:"",userland:v,...{}}),{workAsyncStorage:O,workUnitAsyncStorage:f,serverHooks:L}=N;async function C(e,t,r){r.requestMeta&&(0,s.setRequestMeta)(e,r.requestMeta),N.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let A="/api/create-email-tables/route";A=A.replace(/\/index$/,"")||"/";let h=await N.prepare(e,t,{srcPage:A,multiZoneDraftMode:!1});if(!h)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:b,deploymentId:_,params:v,nextConfig:O,parsedUrl:f,isDraftMode:L,prerenderManifest:C,routerServerContext:w,isOnDemandRevalidate:I,revalidateOnlyGenerated:g,resolvedPathname:S,clientReferenceManifest:U,serverActionsManifest:y}=h,P=(0,o.normalizeAppPath)(A),D=!!(C.dynamicRoutes[P]||C.routes[S]),F=async()=>((null==w?void 0:w.render404)?await w.render404(e,t,f,!1):t.end("This page could not be found"),null);if(D&&!L){let e=!!C.routes[S],t=C.dynamicRoutes[P];if(t&&!1===t.fallback&&!e){if(O.adapterPath)return await F();throw new x.NoFallbackError}}let q=null;!D||N.isDev||L||(q="/index"===(q=S)?"/":q);let X=!0===N.isDev||!D,M=D&&!X;y&&U&&(0,n.setManifestsSingleton)({page:A,clientReferenceManifest:U,serverActionsManifest:y});let B=e.method||"GET",j=(0,i.getTracer)(),k=j.getActiveScopeSpan(),H=!!(null==w?void 0:w.isWrappedByNextServer),K=!!(0,s.getRequestMeta)(e,"minimalMode"),G=(0,s.getRequestMeta)(e,"incrementalCache")||await N.getIncrementalCache(e,O,C,K);null==G||G.resetRequestCache(),globalThis.__incrementalCache=G;let Y={params:v,previewProps:C.preview,renderOpts:{experimental:{authInterrupts:!!O.experimental.authInterrupts},cacheComponents:!!O.cacheComponents,supportsDynamicResponse:X,incrementalCache:G,cacheLifeProfiles:O.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,s)=>N.onRequestError(e,t,r,s,w)},sharedContext:{buildId:b,deploymentId:_}},$=new l.NodeNextRequest(e),W=new l.NodeNextResponse(t),V=u.NextRequestAdapter.fromNodeNextRequest($,(0,u.signalFromNodeResponse)(t));try{let s,n=async e=>N.handle(V,Y).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=j.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route");if(r){let t=`${B} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t),s&&s!==e&&(s.setAttribute("http.route",r),s.updateName(t))}else e.updateName(`${B} ${A}`)}),o=async s=>{var i,o;let l=async({previousCacheEntry:a})=>{try{if(!K&&I&&g&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await n(s);e.fetchMetrics=Y.renderOpts.fetchMetrics;let o=Y.renderOpts.pendingWaitUntil;o&&r.waitUntil&&(r.waitUntil(o),o=void 0);let l=Y.renderOpts.collectedTags;if(!D)return await (0,c.sendResponse)($,W,i,Y.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,E.toNodeOutgoingHttpHeaders)(i.headers);l&&(t[m.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==Y.renderOpts.collectedRevalidate&&!(Y.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&Y.renderOpts.collectedRevalidate,r=void 0===Y.renderOpts.collectedExpire||Y.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:Y.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await N.onRequestError(e,t,{routerKind:"App Router",routePath:A,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:I})},!1,w),t}},u=await N.handleResponse({req:e,nextConfig:O,cacheKey:q,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:C,isRoutePPREnabled:!1,isOnDemandRevalidate:I,revalidateOnlyGenerated:g,responseGenerator:l,waitUntil:r.waitUntil,isMinimalMode:K});if(!D)return null;if((null==u||null==(i=u.value)?void 0:i.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(o=u.value)?void 0:o.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});K||t.setHeader("x-nextjs-cache",I?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),L&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let d=(0,E.fromNodeOutgoingHttpHeaders)(u.value.headers);return K&&D||d.delete(m.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||d.get("Cache-Control")||d.set("Cache-Control",(0,T.getCacheControlHeader)(u.cacheControl)),await (0,c.sendResponse)($,W,new Response(u.value.body,{headers:d,status:u.value.status||200})),null};H&&k?await o(k):(s=j.getActiveScopeSpan(),await j.withPropagatedContext(e.headers,()=>j.trace(d.BaseServerSpan.handleRequest,{spanName:`${B} ${A}`,kind:i.SpanKind.SERVER,attributes:{"http.method":B,"http.target":e.url}},o),void 0,!H))}catch(t){if(t instanceof x.NoFallbackError||await N.onRequestError(e,t,{routerKind:"App Router",routePath:P,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:I})},!1,w),D)throw t;return await (0,c.sendResponse)($,W,new Response(null,{status:500})),null}}e.s(["handler",0,C,"patchFetch",0,function(){return(0,r.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:f})},"routeModule",0,N,"serverHooks",0,L,"workAsyncStorage",0,O,"workUnitAsyncStorage",0,f],648343)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0beauj_._.js.map