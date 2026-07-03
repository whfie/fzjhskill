export const ARMOR_SUBTYPES = ['上装', '下装', '头帽', '戒指', '手部', '腰坠', '腰带', '鞋子', '项链'];

export function isArmorItem(item) {
  return ARMOR_SUBTYPES.includes(item.bType);
}