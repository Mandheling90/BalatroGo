export function getFloorPosition(index: number, total: number) {
  const outerCount = total > 18 ? Math.ceil(total * 0.64) : total
  const inner = index >= outerCount
  const ringIndex = inner ? index - outerCount : index
  const ringCount = inner ? total - outerCount : outerCount
  const angle = -Math.PI / 2 + (Math.PI * 2 * ringIndex) / Math.max(1, ringCount)
  const radiusX = inner ? 26 : 43
  const radiusY = inner ? 19 : 31
  return { x: 50 + Math.cos(angle) * radiusX, y: 50 + Math.sin(angle) * radiusY }
}
