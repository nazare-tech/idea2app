export const uiStylePresets = {
  authFieldInput:
    "h-12 bg-[#FFFFFF] border-[#E0E0E0] text-[#0A0A0A] placeholder:text-[#999999] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0",
  authErrorPill:
    "rounded-lg border border-[#FDECEA] bg-[#FDECEA] px-3 py-2 text-sm text-[#B42318]",
  authSocialButton:
    "flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60",
  authPrimaryButton:
    "h-12 w-full bg-primary text-primary-foreground",
  authDestructiveButton:
    "h-12 w-full bg-[#FF3B30] text-white",
  authFieldLabel:
    "text-[13px] text-muted-foreground",
  authCardCompact:
    "w-full max-w-[480px] border-[#E0E0E0] bg-card",
  authTopIconBadge:
    "flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground",
  settingsIconBadge:
    "h-10 w-10 rounded bg-[#0A0A0A] text-white flex items-center justify-center",
  settingsInfoCard:
    "space-y-4 rounded-xl border border-[#E0E0E0] bg-white p-4",
  analysisErrorBanner:
    "p-4 rounded-xl bg-[rgba(255,59,92,0.1)] border border-[rgba(255,59,92,0.2)] text-[#ff6b8a] text-sm",
  analysisDependencyBanner:
    "p-4 rounded-xl bg-[rgba(255,165,0,0.1)] border border-[rgba(255,165,0,0.2)] text-[#ffa500] text-sm flex items-center justify-between",
  tagPill:
    "inline-flex h-7 items-center rounded-full border border-[#E0E0E0] bg-white px-3 text-xs font-medium text-[#0A0A0A]",
  chatBrandIcon:
    "h-4 w-4 text-[#00d4ff]",
  authDividerLine:
    "h-px flex-1 bg-[#E0E0E0]",
  settingsSurface:
    "border-[#E0E0E0] bg-[#FAFAFA]",
  mutedTextSm:
    "text-sm text-[#666666]",
  analysisDismissAction:
    "text-[#ffa500] hover:text-[#ff8c00]",
  authIconCircle:
    "flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF3B30] text-white",
  authProfileAvatarFallback:
    "bg-[#0A0A0A] text-white text-[12px] font-bold",
  subtleLinkHover:
    "hover:text-[#0A0A0A]",
  authFormMeta:
    "text-xs uppercase tracking-[0.12em] text-[#999999]",
  authCardContainer:
    "mx-auto w-full max-w-[520px] border-[#E0E0E0] bg-card",
  authLinkUnderline:
    "font-semibold text-[#FF3B30] hover:underline",
  headerOutlineTab:
    "h-11 w-full rounded-md px-4 text-sm font-medium text-[#0A0A0A] hover:bg-[#F5F5F5]",
  headerProfileTrigger:
    "relative h-10 inline-flex items-center gap-2.5 rounded-md border border-[#E0E0E0] bg-white px-3.5 py-0 text-[#0A0A0A]",
  headerProfileLabel:
    "text-[13px] font-medium leading-none tracking-tight text-[#0A0A0A]",
  headerLogoutItem:
    "h-11 w-full rounded-md px-4 text-sm font-medium text-[#FF3B30] hover:bg-[#F5F5F5]",
  landingFeaturePill:
    "mt-1 text-xs uppercase tracking-[0.2em] text-[#777777]",
  landingStatCard:
    "flex h-[112px] flex-col items-center justify-center border border-[#E0E0E0] bg-white p-4",
  mutedTextSimple:
    "text-[#666666]",
} as const
