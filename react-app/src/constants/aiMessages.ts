// AIチャットの統一初期メッセージ
export const AI_INITIAL_MESSAGE = `探QメイトのAIアシスタントです！ 🚀

探Qメイトの特徴
① 🤖 AIアシスタントがあなたの探求を伴走！
② 📝 ノートで思考を整理・保存


探Qメイトと一緒なら...
• 探究で立ち止まった時にAIに相談して前に進める！
• 探究の中での思考をノートに記録しておける

さあ、あなたの探究学習を始めよう！🔥

あなたの興味や疑問から、素晴らしい探究の旅が始まります。どんなことでもお聞かせください！ 🌟`;

// Step1専用の初期メッセージ（テーマ設定時）
export const STEP1_INITIAL_MESSAGE = `こんにちは！探究学習のテーマ設定をお手伝いします。

まずは、あなたが興味を持っていることについて教えてください。どんな小さなことでも構いません。

例えば：
• 日常生活で疑問に思っていること
• 好きな分野や趣味
• 社会問題で気になること

何か思い浮かぶことはありますか？`;

// Step2-5の動的メッセージ生成関数
export const generateStep2InitialMessage = (userTheme: string): string => {
  return `こんにちは！あなたの探究テーマ「${userTheme}」について、多角的な視点から深く考察していきましょう。

今日はどの視点から始めたいですか？
• 歴史的な背景や経緯
• 現代における課題や問題点
• 未来への影響や可能性
• 個人的な体験や思い

どんな角度からでも大丈夫です。一緒に探究を深めていきましょう！`;
};

export const generateStep3InitialMessage = (userTheme: string): string => {
  return `「${userTheme}」についての探究、順調に進んでいますね！

ここでは、あなた自身と深く関わる問いを立てていきましょう。

例えば：
• 「私にとって○○とは何か？」
• 「なぜ私は○○に興味を持つのか？」
• 「○○は私の生活にどう影響しているか？」

あなたならではの視点で、問いを考えてみてください。`;
};

export const generateStep4InitialMessage = (userTheme: string): string => {
  return `素晴らしい問いができましたね！

今度は「${userTheme}」と社会の繋がりを探っていきましょう。

考えてみたいポイント：
• この問題は社会にどんな影響を与えているか
• どんな人々が関わっているか
• 解決するとどんな良いことがあるか

社会的な視点から、あなたの問いを広げてみましょう。`;
};

export const generateStep5InitialMessage = (allThemes: { step1: string; step2: string; step3: string; step4: string }): string => {
  return `これまでの探究の歩みを振り返り、次のアクションを具体的に計画しましょう。

あなたの探究の軌跡：
• Step 1: ${allThemes.step1}
• Step 2: ${allThemes.step2}
• Step 3: ${allThemes.step3}
• Step 4: ${allThemes.step4}

この探究を実現するために、どんな小さな一歩から始めますか？具体的なアクションプランを一緒に考えましょう！`;
};