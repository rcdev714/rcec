seb@0x0mm4 rcec-fix % npm run build && npm run test

> build
> next build

   ▲ Next.js 15.5.2
   - Environments: .env.local

   Creating an optimized production build ...
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (114kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
 ⚠ Compiled with warnings in 1810ms

./node_modules/@supabase/realtime-js/dist/module/lib/websocket-factory.js
A Node.js API is used (process.versions at line: 35) which is not supported in the Edge Runtime.
Learn more: https://nextjs.org/docs/api-reference/edge-runtime

Import trace for requested module:
./node_modules/@supabase/realtime-js/dist/module/lib/websocket-factory.js
./node_modules/@supabase/realtime-js/dist/module/index.js
./node_modules/@supabase/supabase-js/dist/module/index.js
./node_modules/@supabase/ssr/dist/module/createServerClient.js
./node_modules/@supabase/ssr/dist/module/index.js
./lib/supabase/middleware.ts

./node_modules/@supabase/supabase-js/dist/module/index.js
A Node.js API is used (process.version at line: 24) which is not supported in the Edge Runtime.
Learn more: https://nextjs.org/docs/api-reference/edge-runtime

Import trace for requested module:
./node_modules/@supabase/supabase-js/dist/module/index.js
./node_modules/@supabase/ssr/dist/module/createServerClient.js
./node_modules/@supabase/ssr/dist/module/index.js
./lib/supabase/middleware.ts

 ✓ Compiled successfully in 11.6s

Failed to compile.

./app/api/agent/chat/route.ts
133:74  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/agent/cost-summary/route.ts
143:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
226:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/chat/route.ts
133:74  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/usage/timeseries/route.ts
70:11  Error: 'processedRunIds' is assigned a value but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars

./app/offerings/page.tsx
146:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/chat-ui.tsx
6:94  Error: 'Zap' is defined but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars
152:10  Error: 'currentRunId' is assigned a value but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars
255:21  Error: 'subscribeToRun' is assigned a value but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars
1264:66  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1563:48  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1563:93  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1573:61  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/companies-ui.tsx
56:6  Warning: React Hook useEffect has a missing dependency: 'isFetching'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./components/map-globe.tsx
41:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./lib/agents/sales-agent/context-optimizer.ts
7:23  Error: 'HumanMessage' is defined but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars
7:48  Error: 'SystemMessage' is defined but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars
107:10  Error: 'summarizeMessage' is defined but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars

./lib/agents/sales-agent/graph.ts
77:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./lib/agents/sales-agent/index.ts
201:101  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
202:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
204:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
219:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
224:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
224:75  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
228:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
230:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
231:33  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
231:56  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
232:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
232:67  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
237:97  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
307:49  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
322:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
431:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
440:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./lib/agents/sales-agent/nodes.ts
5:10  Error: 'createClient' is defined but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars
6:10  Error: 'UserOffering' is defined but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars
45:10  Error: 'agentCache' is defined but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars
111:11  Error: 'supabase' is assigned a value but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars
209:58  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
449:49  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
458:68  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
496:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
499:83  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
502:86  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
511:59  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
522:60  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
535:114  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
579:73  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
620:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
630:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
632:68  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
661:59  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
662:65  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
663:64  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
664:61  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
665:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
665:80  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
726:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
738:33  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
822:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1041:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1050:50  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1072:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1079:33  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1083:84  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1086:87  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1092:57  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1251:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1282:66  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./lib/agents/sales-agent/recovery.ts
7:10  Error: 'BaseMessage' is defined but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars
7:23  Error: 'AIMessage' is defined but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars
239:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
271:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
286:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./lib/chat-agent-langgraph.ts
158:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./lib/token-counter.ts
103:65  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./lib/tools/offerings-tools.ts
198:50  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
213:62  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
222:63  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
259:61  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./lib/tools/web-search.ts
671:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
750:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
847:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./lib/usage-atomic.ts
86:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
111:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
151:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/trigger/example.ts
9:26  Error: 'ctx' is defined but never used. Allowed unused args must match /^_/u.  @typescript-eslint/no-unused-vars

./src/trigger/sales-agent.ts
3:10  Error: 'z' is defined but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars
74:40  Error: 'BaseMessage' is assigned a value but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars
118:13  Error: 'checkpointer' is assigned a value but never used. Allowed unused vars must match /^_/u.  @typescript-eslint/no-unused-vars

info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
seb@0x0mm4 rcec-fix % 