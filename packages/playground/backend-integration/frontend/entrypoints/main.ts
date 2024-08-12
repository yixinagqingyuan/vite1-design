export const colorClass = 'text-black'

export function colorHeading() {
  document.querySelector('h1').className = colorClass
}

colorHeading()

if (import.meta.hot) {
  import.meta.hot.accept()
}
