/* Product Plan — content data (extracted from the source PRD) */
window.PP_STORIES = [
  { id: "US-001", title: "Install and activate the extension",
    role: "fashion influencer", want: "install the Wear It Now AI Mirror browser extension and activate it on a clothing website", so: "I can see myself wearing the products on that site",
    ac: [
      "Available on the Chrome Web Store and installs without errors on Chrome 110+.",
      "After installation, the extension icon appears in the Chrome toolbar.",
      "Clicking the icon on any page opens a popup with a \u201cTry On Mirror\u201d toggle.",
      "If not logged in, the toggle is disabled and a \u201cSign In\u201d link is visible.",
      "If logged in with an avatar and credits, the toggle is enabled."
    ]},
  { id: "US-002", title: "Register and create an account",
    role: "new visitor", want: "create an account using my email or Google", so: "I can access the try-on features",
    ac: [
      "Registration accepts email and password or Google OAuth.",
      "Invalid email format shows: \u201cPlease enter a valid email address.\u201d",
      "Password under 8 chars or missing a number/letter shows the requirement.",
      "Duplicate email shows: \u201cAn account with this email already exists. Sign in instead.\u201d",
      "Successful registration sends a verification email.",
      "User is redirected to the onboarding avatar upload flow.",
      "User cannot generate try-on images until their email is verified."
    ]},
  { id: "US-003", title: "Upload an avatar photo",
    role: "registered user", want: "upload a photo of myself as my avatar", so: "the AI can generate try-on images showing me in the clothes",
    ac: [
      "Accepts JPEG, PNG, and WEBP files up to 10 MB.",
      "Files over 10 MB show: \u201cFile size exceeds 10 MB. Please upload a smaller image.\u201d",
      "Unsupported formats show a specific error message.",
      "No detectable face shows: \u201cWe couldn\u2019t detect a clear face in your photo\u2026\u201d",
      "Processed photo shows a preview with \u201cConfirm\u201d and \u201cTry a different photo.\u201d",
      "Confirming saves the avatar and advances onboarding.",
      "User can replace their avatar anytime from settings with the same rules."
    ]},
  { id: "US-004", title: "Receive free trial credits",
    role: "newly registered user who completed onboarding", want: "receive free trial credits automatically", so: "I can try the product before purchasing",
    ac: [
      "Exactly 5 credits added after email verification and avatar upload.",
      "Dashboard balance reflects 5 credits immediately after onboarding.",
      "Success toast: \u201c5 free credits added to your account. Start trying on clothes!\u201d",
      "Trial credits granted once per account; re-uploading does not add more."
    ]},
  { id: "US-005", title: "Generate try-on images on a clothing site",
    role: "fashion influencer with credits", want: "activate the mirror on a clothing website and see myself wearing the products", so: "I can evaluate styles and create content without buying items",
    ac: [
      "Activating on a page with product images shows a credit confirmation banner with count and total cost.",
      "Banner includes \u201cGenerate Try-Ons \u2013 Use X Credits\u201d and \u201cCancel.\u201d",
      "Cancel dismisses the banner, consumes no credits, and leaves the page unchanged.",
      "Generate deducts credits immediately and begins generation.",
      "Each image shows a shimmer placeholder while generating, then the result.",
      "Popup balance updates to reflect deducted credits.",
      "A single failure restores the original image, shows a retry icon, and charges no credit.",
      "Full service outage shows an error banner; no images replaced, no credits consumed."
    ]},
  { id: "US-006", title: "Browse across pages with the mirror active",
    role: "fashion influencer", want: "the mirror to keep working as I navigate between pages on a clothing site", so: "I can browse naturally without re-activating it every page",
    ac: [
      "Toggle state persists across pages within the same domain and session.",
      "Each new page with product images shows a new credit confirmation before generating.",
      "Returning to an already-generated page serves cached images with no charge.",
      "Navigating away mid-generation cancels remaining work and charges nothing for them."
    ]},
  { id: "US-007", title: "Download a generated try-on image",
    role: "fashion influencer", want: "download a generated try-on image", so: "I can use it in my content or share it with my audience",
    ac: [
      "Hovering a successful image reveals a download icon overlay.",
      "Clicking saves the image locally in JPEG format.",
      "File is named wearit-[timestamp].jpg.",
      "The download consumes no additional credit.",
      "No download icon on shimmer placeholders or failed slots."
    ]},
  { id: "US-008", title: "Purchase credits",
    role: "registered user who ran out of credits", want: "purchase a credit bundle", so: "I can continue generating try-on images",
    ac: [
      "Purchase page shows at least three bundles with price, credits, and per-credit cost.",
      "Selecting a bundle redirects to a Stripe-hosted checkout page.",
      "Successful payment adds credits to the balance immediately.",
      "Success toast on the dashboard: \u201cX credits added to your account.\u201d",
      "Failed or cancelled payment returns to the credits page with no change.",
      "Transaction appears in history with correct date, amount, and quantity."
    ]},
  { id: "US-009", title: "View generation history",
    role: "registered user", want: "view a history of my try-on sessions", so: "I can track credit usage and revisit sites I\u2019ve used",
    ac: [
      "Lists all past sessions in reverse chronological order.",
      "Each entry shows date, website domain, image count, and credits consumed.",
      "Empty state: \u201cNo try-on sessions yet. Install the extension and start browsing.\u201d",
      "History is paginated at 20 entries per page."
    ]},
  { id: "US-010", title: "Report an incompatible site",
    role: "registered user", want: "report a clothing site where the extension couldn\u2019t detect product images", so: "the team can investigate and add support",
    ac: [
      "No detected images shows a \u201cReport this site\u201d button in the popup.",
      "Clicking submits the page URL and account ID to the compatibility queue.",
      "Confirmation: \u201cThanks! We\u2019ve logged this site for review.\u201d",
      "Same URL can\u2019t be submitted more than once per user per day.",
      "Report appears in the admin panel with URL, date, and status \u201cNew.\u201d"
    ]},
  { id: "US-011", title: "Admin manages user credits",
    role: "admin", want: "manually adjust a user\u2019s credit balance", so: "I can resolve billing issues or grant goodwill credits",
    ac: [
      "Admin panel shows a searchable list of users by email.",
      "Selecting a user shows current balance and full transaction history.",
      "Admin can add/deduct an integer with a required reason field.",
      "Submitting updates the balance and logs the admin ID and reason.",
      "No reason shows: \u201cPlease provide a reason for this adjustment.\u201d",
      "Deductions below zero are blocked: \u201cCannot reduce balance below zero.\u201d"
    ]}
];

window.PP_REQ_GROUPS = [
  { name: "Browser extension", icon: "puzzle", items: [
    "Installable from the Chrome Web Store, compatible with Chrome 110+.",
    "Injects a toolbar popup with a \u201cTry On Mirror\u201d toggle on any page.",
    "When toggled on, scans the page DOM for clothing <code>&lt;img&gt;</code> elements and returns a count.",
    "Shows a credit confirmation banner with image count and total credits before generating.",
    "Does not begin generating until the user explicitly confirms.",
    "Sends each product image URL and the avatar reference to the AI API on confirmation.",
    "Replaces each original image with a shimmer placeholder while loading.",
    "Replaces each shimmer with the generated try-on image on success.",
    "On a single failure, restores the original image, shows a retry icon, charges no credit.",
    "Shows an error banner if the AI service is fully unavailable; consumes no credits.",
    "Caches generated images for the session so revisits don\u2019t re-charge.",
    "Restores all originals instantly when the toggle is turned off (no reload).",
    "Shows a hover download overlay on each successful image.",
    "Download saves locally as JPEG at the original display dimensions.",
    "Shows a \u201cReport this site\u201d button when no images are detected.",
    "Cancels in-progress requests and charges nothing if the user navigates away.",
    "Requires login before the toggle can be activated.",
    "If logged out, shows a \u201cSign In\u201d link opening the dashboard in a new tab.",
    "Maintains the session with a stored token; no re-login unless it expires.",
    "Displays the current credit balance in the popup at all times when logged in."
  ]},
  { name: "Accounts & onboarding", icon: "user-round", items: [
    "Register with email and password.",
    "Register or log in with Google OAuth.",
    "Passwords \u2265 8 chars with at least one number and one letter.",
    "Send a verification email; require verification before generating.",
    "Guided onboarding after first registration prompts avatar upload first.",
    "Allow one avatar photo per account.",
    "Accept JPEG, PNG, or WEBP avatars up to 10 MB.",
    "Automated quality check rejects photos with no detectable face, with a specific reason.",
    "Show a preview of the processed avatar for confirmation before saving.",
    "Allow replacing the avatar anytime; prior images are not altered."
  ]},
  { name: "Credits & payments", icon: "credit-card", items: [
    "Display the current balance prominently on the dashboard and in the popup.",
    "Offer at least three credit bundles at checkout (assumed 20 / 60 / 150 with increasing discounts).",
    "Process purchases via Stripe; add credits to the balance immediately on success.",
    "Show full transaction history: date, amount paid, credits received.",
    "Show generation history: date, website, image count, credits consumed.",
    "Grant 5 free trial credits on completing avatar upload and email verification."
  ]},
  { name: "Admin", icon: "shield-check", items: [
    "Paginated list of all users with email, registration date, balance, and total consumed.",
    "Manually add or deduct credits from any account with a required reason.",
    "View all site compatibility reports with reported URL and submission date.",
    "Mark reports as \u201cUnder Review,\u201d \u201cResolved,\u201d or \u201cWon\u2019t Fix.\u201d"
  ]},
  { name: "Analytics events", icon: "bar-chart-3", span: true, items: [
    "Extension installed.",
    "Avatar upload completed.",
    "Mirror activated on a page (includes the site domain).",
    "Credit generation confirmed (includes image count and credits consumed).",
    "Generated image downloaded.",
    "Credit purchase initiated and successfully completed."
  ]}
];

window.PP_SCOPE = [
  { t: "Mobile", h: "Mobile browser or native app support", d: "The extension model requires a desktop browser. Deferred until the core experience is validated." },
  { t: "Browsers", h: "Firefox, Safari, or Edge support", d: "MVP targets Chrome only to reduce QA and compatibility overhead." },
  { t: "Categories", h: "Non-clothing categories", d: "Shoes, accessories, bags, and jewelry require separate model training. Deferred." },
  { t: "Media", h: "Video or animated try-on", d: "Real-time video overlay needs far more compute and latency management. Deferred." },
  { t: "Avatars", h: "Multiple avatar profiles per account", d: "Adds complexity to the credit model and UX. Deferred." },
  { t: "Organize", h: "Outfit saving, wishlists, or lookbooks", d: "Valuable, but not required to validate the core try-on experience." },
  { t: "Social", h: "Social sharing, community, or follower system", d: "A growth layer, not an MVP requirement." },
  { t: "AI", h: "AI styling recommendations", d: "Suggesting what to wear is a separate capability deferred post-MVP." },
  { t: "B2B", h: "B2B retailer integration or white-label", d: "The MVP is entirely consumer-facing. B2B is a future revenue stream." },
  { t: "Pricing", h: "Subscription pricing model", d: "MVP uses pay-per-use credits only. Subscriptions may follow once usage is understood." },
  { t: "Affiliate", h: "Affiliate link tracking or monetization tools", d: "Influencer-specific affiliate features are deferred to a later phase." },
  { t: "Offline", h: "Offline mode", d: "The extension requires an active connection to call the AI generation API." }
];
