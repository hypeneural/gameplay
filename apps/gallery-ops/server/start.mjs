import { createGalleryOpsAdminServer, configFromEnv } from './adminServer.mjs';
const config = configFromEnv(process.env);
const host = process.env.GALLERY_OPS_HOST || '127.0.0.1';
if (!['127.0.0.1','::1','0.0.0.0'].includes(host)) throw Error('GALLERY_OPS_HOST_INVALID');
const port = Number(process.env.GALLERY_OPS_PORT || 4189);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('GALLERY_OPS_PORT_INVALID');
const app = createGalleryOpsAdminServer({config});
app.listen(port,host,()=>console.info(JSON.stringify({event:'gallery_ops_admin_started',port})));
for(const signal of ['SIGTERM','SIGINT']) process.once(signal,()=>app.close(()=>process.exit(0)));
