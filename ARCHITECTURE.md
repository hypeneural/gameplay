# Architecture

The live web path is `React shell → lazily imported Phaser game → typed platform contracts`. Local media follows `import → validate → auto-orient → derivative queue → authorization endpoint → internal Nginx location`.

The browser receives opaque session/photo identifiers and a variant URL only after authorization. A physical path, original filename and original asset never form part of the browser contract.

See [the detailed architecture](docs/architecture/FOUNDATION.md) and [the local-media design](docs/media/LOCAL_MEDIA_ARCHITECTURE.md).
