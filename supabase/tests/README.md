# Database tests

Add pgTAP tests here as transactional RPC functions are implemented.

Minimum required coverage:

- anonymous users cannot access BookTracker data;
- an active member can read only their own drive;
- volunteers cannot perform organizer-only writes;
- allocations cannot exceed accepted inventory;
- a shipped box cannot be edited without an authorized reversal.
