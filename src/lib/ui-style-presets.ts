export const uiStylePresets = {
  authFieldInput:
    "h-12 bg-white border-border-subtle text-text-primary placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0",
  authErrorPill:
    "rounded-lg border border-[#FDECEA] bg-[#FDECEA] px-3 py-2 text-sm text-destructive",
  authSocialButton:
    "flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60",
  authPrimaryButton:
    "h-12 w-full bg-primary text-primary-foreground",
  authDestructiveButton:
    "h-12 w-full bg-destructive text-destructive-foreground",
  authFieldLabel:
    "text-[13px] text-muted-foreground",
  authCardCompact:
    "w-full max-w-[480px] border-border-subtle bg-card",
  authTopIconBadge:
    "flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground",
  settingsIconBadge:
    "h-10 w-10 rounded bg-text-primary text-white flex items-center justify-center",
  settingsInfoCard:
    "space-y-4 rounded-xl border border-border-subtle bg-white p-4",
  analysisErrorBanner:
    "p-4 rounded-xl bg-accent-primary-subtle border border-accent-primary-soft text-destructive text-sm",
  analysisDependencyBanner:
    "p-4 rounded-xl bg-[rgba(233,196,106,0.15)] border border-[rgba(233,196,106,0.3)] text-[#8A6A00] text-sm flex items-center justify-between",
  tagPill:
    "inline-flex h-7 items-center rounded-full border border-border-subtle bg-white px-3 text-xs ui-font-medium text-text-primary",
  chatBrandIcon:
    "ui-icon-16 text-text-accent",
  authDividerLine:
    "h-px flex-1 bg-border-subtle",
  settingsSurface:
    "border-border-subtle bg-background",
  mutedTextSm:
    "text-sm text-text-secondary",
  analysisDismissAction:
    "text-warm-sand hover:text-warm-coral",
  authIconCircle:
    "flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground",
  authProfileAvatarFallback:
    "bg-text-primary text-white text-[12px] font-bold",
  subtleLinkHover:
    "hover:text-text-primary",
  authFormMeta:
    "text-xs uppercase tracking-[0.12em] text-text-muted",
  authCardContainer:
    "mx-auto w-full max-w-[520px] border-border-subtle bg-card",
  authLinkUnderline:
    "font-semibold text-primary hover:underline",
  headerOutlineTab:
    "h-11 w-full rounded-md px-4 ui-text-sm-muted ui-font-medium hover:bg-muted",
  headerProfileTrigger:
    "relative h-10 inline-flex items-center gap-2.5 rounded-md border border-border-subtle bg-white px-3.5 py-0 text-text-primary",
  headerProfileLabel:
    "text-[13px] ui-font-medium leading-none tracking-tight text-text-primary",
  headerLogoutItem:
    "h-11 w-full rounded-md px-4 text-sm ui-font-medium text-destructive hover:bg-muted",
  landingFeaturePill:
    "mt-1 text-xs uppercase tracking-[0.2em] text-text-secondary",
  landingStatCard:
    "flex h-[112px] flex-col items-center justify-center border border-border-subtle bg-white p-4",
  mutedTextSimple:
    "text-text-secondary",
} as const
