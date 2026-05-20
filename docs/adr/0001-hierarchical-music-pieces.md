# Hierarchical Music Pieces for Multi-Movement Support

We chose a self-referencing parent-child relationship (`parentId`) on the `musicLibrary` collection to represent multi-movement compositions, rather than a flat JSON mapping or a separate learning tracks collection. This relational hierarchy allows individual movements to possess their own independent durations and voice-part-specific learning tracks while avoiding PocketBase's strict limit of 20 files per multi-file field. In the event of deleting a parent piece, we intercept the deletion to offer the user a choice between cascadingly deleting all associated movements or unlinking and preserving them as independent, standalone music pieces.

## Status
Accepted

## Considered Options
1. **Flat JSON Extension**: Storing movement track mappings inside a unified JSON field. Rejected because PocketBase limits multi-file fields (`audioFiles`) to a maximum of 20 files, which a multi-movement piece with 9 voice parts would easily exceed.
2. **Dedicated Learning Tracks Collection**: Storing tracks as separate relation records. Rejected because it introduces excessive collection schema and query overhead for simple audio player attachments.
