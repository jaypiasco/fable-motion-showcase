"""
Lip-Sync Providers Package.
"""

from services.media.lipsync.passthrough_adapter import PassthroughLipSyncAdapter
from services.media.lipsync.sync_labs_adapter import SyncLabsLipSyncAdapter

__all__ = [
    "PassthroughLipSyncAdapter",
    "SyncLabsLipSyncAdapter",
]
