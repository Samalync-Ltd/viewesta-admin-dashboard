import { useCallback, useState } from "react";
import { MediaPreviewModal, type PreviewRequest } from "./MediaPreview";

/** Opens a preview window: `preview(request)` to show it, and render `modal` once in the page. */
export function useMediaPreview() {
  const [request, setRequest] = useState<PreviewRequest | null>(null);
  const close = useCallback(() => setRequest(null), []);
  return {
    preview: setRequest,
    modal: request ? <MediaPreviewModal request={request} onClose={close} /> : null,
  };
}
