const globals = globalThis as Record<string, any>

console.log(JSON.stringify({
  reviewTable: globals.Review?.table,
  reviewWhere: typeof globals.Review?.where,
  userWhere: typeof globals.User?.where,
}))
