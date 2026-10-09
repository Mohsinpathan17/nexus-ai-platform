export interface PreviewAsset { name: string; content: string }
export interface FrontendPreview { scripts: PreviewAsset[]; styles: PreviewAsset[] }
export interface RunOutputs { sourceAvailable: boolean; previewAvailable: boolean; previewExpiresAt?: string; previewUnavailableReason?: "expired" | "quota" }
export interface PreviewAccess { url: string; expiresAt: string }
