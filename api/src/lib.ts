// see https://github.com/edu-sharing/Edu-Sharing/blob/3b1f114f9437e164b1979ad59817e47c44abd1fa/Frontend/projects/edu-sharing-api/src/lib/wrappers/search.service.ts#L615

export function omitProperty<T, K extends keyof T>(
  obj: T,
  property: K
): Omit<T, K> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [property]: _, ...result } = obj
  return result
}

export function pickProperties<T, K extends keyof T>(
  obj: T,
  properties: K[]
): Pick<T, K> {
  return properties.reduce((acc, prop) => {
    acc[prop] = obj[prop]
    return acc
  }, {} as Pick<T, K>)
}
