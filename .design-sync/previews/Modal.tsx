import { Modal, Button } from "kub-stake-info";

const noop = () => {};

// Overlay shell — rendered open inside a single full-card (cfg.overrides). The
// min-height wrapper gives the card mount real height so the fixed overlay fills
// and centers it. Inner content uses the app's own utility idiom.
export const TransactionSubmitted = () => (
  <div style={{ minHeight: "100vh" }}>
    <Modal open onClose={noop} className="max-w-md">
      <div className="p-6">
        <h3 className="text-lg font-bold text-ink">Transaction submitted</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Your stake of 500 KUB is being confirmed on KUB Chain. This usually
          takes a few seconds — you can keep this open or close it.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={noop}>
            Close
          </Button>
          <Button variant="primary" onClick={noop}>
            View on explorer
          </Button>
        </div>
      </div>
    </Modal>
  </div>
);
