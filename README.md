# Leafline — Community Book Drive Tracker

Interactive local MVP for receiving, reviewing, packing, and shipping fictional book-drive inventory.

## Run locally

From this directory:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

No installation or build step is required. Data is stored in browser `localStorage` under `bookDrive.texasDemo.v1`.

The included fictional sample drive covers Austin, Leander, Cedar Park, and a North Austin sorting hub.

## Demo walkthrough

1. Review reconciled counts on the Dashboard.
2. Open Receive and add a title or category batch.
3. In Inventory, move the batch to Central Sorting and mark it accepted.
4. In Boxes, create a box and add accepted inventory.
5. Enter a physical count matching the box total and mark it ready.
6. Record the simulated shipment; the box becomes locked.
7. Preview or print its manifest and export inventory or a JSON backup from Setup.

All included records and shipment actions are fictional.
