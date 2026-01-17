# Bandwidth Saver Proxy

## How it works

### Compression

It checks if any external compressor endpoints return valid image data and redirects to them if true, otherwise, it fetches the uncompressed image from the given url and uses the `sharp` library to dynamically compress it and return it.
