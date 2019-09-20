//获取x-y之间的随机数
export const getRandom = (x,y) =>{
  return Math.floor(Math.random() * (x - y) + y)
}