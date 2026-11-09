/** Bóng đồ đang đặt. Cập nhật mỗi lần rê chuột, không đi qua React. */
export const draft = {
  active: false,
  x: 0,
  z: 0,
  y: 0,
  rotY: 0,
  valid: false,
  w: 1,
  h: 1,
  d: 1,
  color: "#c8c2b8",
  placeOn: undefined as string | undefined,
  stackedOn: undefined as string | undefined,
};
