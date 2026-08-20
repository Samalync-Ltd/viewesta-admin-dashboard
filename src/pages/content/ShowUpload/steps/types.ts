import type { ShowFormData } from "../../../../types/show";

export interface StepProps {
  data: ShowFormData;
  updateData: (data: Partial<ShowFormData>) => void;
  onNext?: () => void;
  onBack?: () => void;
}
