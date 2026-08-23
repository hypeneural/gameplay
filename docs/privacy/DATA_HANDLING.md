# Privacy and data handling

Original photographs remain local to the VPS and outside the webroot. Public links contain an opaque session token; public photo IDs and derived paths are independent from database IDs and filenames. An authorized endpoint returns a local Nginx internal redirect only for an allowed session/photo/variant pair.

This foundation contains no third-party media storage or transformation integration.
