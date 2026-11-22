// Turns an amount into Malaysian-style words, e.g.
// 4199 -> "RINGGIT MALAYSIA : FOUR THOUSAND ONE HUNDRED AND NINETY-NINE ONLY"
// 20.50 -> "RINGGIT MALAYSIA : TWENTY AND CENTS FIFTY ONLY"
const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
const SCALES = ['', 'THOUSAND', 'MILLION', 'BILLION']

function below100(n) {
  if (n < 20) return ONES[n]
  const t = TENS[Math.floor(n / 10)]
  const o = ONES[n % 10]
  return o ? t + '-' + o : t
}

function below1000(n) {
  const h = Math.floor(n / 100)
  const r = n % 100
  if (!h) return below100(r)
  return ONES[h] + ' HUNDRED' + (r ? ' AND ' + below100(r) : '')
}

function wholeToWords(n) {
  if (n === 0) return 'ZERO'
  const groups = []
  let rest = n
  while (rest > 0) {
    groups.push(rest % 1000)
    rest = Math.floor(rest / 1000)
  }
  const parts = []
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]
    if (!g) continue
    let text = below1000(g)
    if (SCALES[i]) text += ' ' + SCALES[i]
    // "and" before a last group that is under 100, e.g. ONE THOUSAND AND FIFTY
    if (i === 0 && parts.length && g < 100) text = 'AND ' + text
    parts.push(text)
  }
  return parts.join(' ')
}

// Words only, e.g. "THREE THOUSAND SEVEN HUNDRED AND TWENTY AND CENTS FORTY ONLY"
export function amountWordsOnly(amount) {
  return amountInWords(amount).replace('RINGGIT MALAYSIA : ', '')
}

export function amountInWords(amount) {
  const v = Math.round(Math.abs(Number(amount || 0)) * 100)
  const ringgit = Math.floor(v / 100)
  const sen = v % 100
  let words
  if (ringgit === 0 && sen === 0) words = 'ZERO'
  else if (ringgit === 0) words = below100(sen) + ' CENTS'
  else {
    words = wholeToWords(ringgit)
    if (sen) words += ' AND CENTS ' + below100(sen)
  }
  return 'RINGGIT MALAYSIA : ' + words + ' ONLY'
}
