
export type  signalingStruct = {
  ICEList:RTCIceCandidateInit[],
  offer?:string,
  answer?:string,
  backUrl?:string,
  id:string
}

export function decodeBase64(base64:string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}