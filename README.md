# Mapping A Colony webapp

Clientside webapp stuff for Mapping A Colony. The project is running
two WordPress websites, one for English and one for Danish
language. This webapp is generic across the language versions, and
extends the functionality of the WordPress websites.

The clientside interacts with the [middleware
API](https://github.com/xmacex/mappingacolonyapi), most importantly to
pull data from storage. The division of labour is somewhat messy, and
as it is currently, parsing of CSV to more structured data model is
done by the client.