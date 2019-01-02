import zxcvbn from 'zxcvbn'

export async function sha512(message) {
  // encode as UTF-8
  const msgBuffer = new TextEncoder('utf-8').encode(message)

  // hash the message
  const hashBuffer = await crypto.subtle.digest('SHA-512', msgBuffer)

  // convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer))

  // convert bytes to hex string
  const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('')
  return hashHex
}

export function animatePath(path, initialDashOffset, finalDashOffset, animDuration, callback=(() => {})) {
  let length = path.getTotalLength()
  path.style.transition = path.style.WebkitTransition = 'none'
  path.style.strokeDasharray = length + ' ' + length
  path.style.strokeDashoffset = initialDashOffset === -1 ? length : initialDashOffset
  path.getBoundingClientRect()
  path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset ' + animDuration + 'ms linear'
  path.style.strokeDashoffset = finalDashOffset === -1 ? length : finalDashOffset
  setTimeout(() => callback(), animDuration + 100)
}

export const validateEmail = email => /^[A-Za-z0-9\.]+@[A-Za-z0-9]+\.[A-Za-z]+$/.test(email)

export const validatePassword = password => zxcvbn(password).score >= 3 || /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})/.test(password)