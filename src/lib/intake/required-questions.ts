import type { IntakeAnswer, IntakeQuestion } from "@/lib/intake/types"

export const REQUIRED_PLATFORM_QUESTION: IntakeQuestion = {
  id: "primary-platform",
  question: "Where will people use the first version?",
  selectionMode: "single",
  options: [
    { id: "desktop-web", label: "Desktop website" },
    { id: "mobile-web", label: "Mobile website" },
    { id: "native-mobile-app", label: "iOS / Android app" },
    { id: "native-desktop-app", label: "Mac / Windows app" },
  ],
  allowOther: false,
  helperText: "Pick where users will open the first working version. A mobile website runs in the browser; an iOS / Android app is installed.",
}

export function ensureRequiredPlatformQuestion(questions: IntakeQuestion[], maxQuestions = 7) {
  const normalizedQuestions: IntakeQuestion[] = []
  let insertedPlatformQuestion = false

  for (const question of questions) {
    if (isPlatformQuestion(question)) {
      if (!insertedPlatformQuestion) {
        normalizedQuestions.push(REQUIRED_PLATFORM_QUESTION)
        insertedPlatformQuestion = true
      }
      continue
    }

    normalizedQuestions.push(question)
  }

  if (insertedPlatformQuestion) return normalizedQuestions

  if (normalizedQuestions.length >= maxQuestions) {
    return [
      ...normalizedQuestions.slice(0, maxQuestions - 1),
      REQUIRED_PLATFORM_QUESTION,
    ]
  }

  return [...normalizedQuestions, REQUIRED_PLATFORM_QUESTION]
}

export function validateRequiredPlatformAnswer(questions: IntakeQuestion[], answers: IntakeAnswer[]) {
  const platformQuestion = questions.find((question) => question.id === REQUIRED_PLATFORM_QUESTION.id)
  if (!platformQuestion) {
    return "Question set must include the required platform question"
  }

  if (
    platformQuestion.selectionMode !== "single" ||
    platformQuestion.allowOther ||
    platformQuestion.options.length !== REQUIRED_PLATFORM_QUESTION.options.length ||
    !REQUIRED_PLATFORM_QUESTION.options.every((option) =>
      platformQuestion.options.some((candidate) => candidate.id === option.id)
    )
  ) {
    return "Platform question must use the supported platform choices"
  }

  const platformAnswer = answers.find((answer) => answer.questionId === REQUIRED_PLATFORM_QUESTION.id)
  if (!platformAnswer) {
    return "Please choose where the first version should primarily live"
  }

  const selectedOptionIds = platformAnswer.selectedOptionIds ?? []
  if (selectedOptionIds.length !== 1) {
    return "Please choose exactly one primary platform"
  }

  const selectedOptionId = selectedOptionIds[0]
  if (!REQUIRED_PLATFORM_QUESTION.options.some((option) => option.id === selectedOptionId)) {
    return "Selected platform is not supported"
  }

  if (platformAnswer.otherText || platformAnswer.text || platformAnswer.decideForMe) {
    return "Platform must be selected from the supported choices"
  }

  return null
}

function isPlatformQuestion(question: IntakeQuestion) {
  const questionText = `${question.id} ${question.question}`.toLowerCase()
  const optionText = question.options.map((option) => `${option.id} ${option.label}`).join(" ").toLowerCase()
  const searchableText = `${questionText} ${optionText}`
  const optionCategories = new Set<string>()

  if (/\bdesktop(?:\s+(?:web|app))?\b/.test(optionText)) optionCategories.add("desktop")
  if (/\bmobile(?:\s+(?:web|app))?\b|\bphone\b/.test(optionText)) optionCategories.add("mobile")
  if (/\bnative\b/.test(optionText)) optionCategories.add("native")
  if (/\bweb\b/.test(optionText)) optionCategories.add("web")

  return (
    searchableText.includes("platform") ||
    searchableText.includes("where should it live") ||
    searchableText.includes("where should this live") ||
    searchableText.includes("where should the first version live") ||
    searchableText.includes("where will it live") ||
    searchableText.includes("where will this live") ||
    searchableText.includes("primary device") ||
    searchableText.includes("form factor") ||
    searchableText.includes("native app") ||
    searchableText.includes("web app") ||
    searchableText.includes("responsive") ||
    (
      optionCategories.size >= 2 &&
      /\b(where|live|platform|device|app|web|desktop|mobile|phone|native)\b/.test(questionText)
    )
  )
}
