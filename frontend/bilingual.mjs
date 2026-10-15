/** Local, display-only translations. Never requests or publishes private data. */
const COPY = {
  '女巫每晚限用一瓶藥':'Limit witch to one potion per night', '女巫每晚用藥':'Witch potions per night', '最多一瓶':'One potion', '無限制':'No limit',
  '本局可同晚使用解藥及毒藥，各限全局一次。解藥只能救狼人目標；毒藥可選任意存活玩家。':'Both potions may be used on the same night, each once per game. The antidote saves the wolves’ target; poison may target any living player.',
  '女巫的抉擇':'The witch’s choice',
  '啟用遺言':'Enable last words', '遺言':'Last words', '最後的話':'Last words',
  '請指定座位發表遺言。說完後由主持人確認，再繼續遊戲。':'The indicated player may give their last words. The host confirms when they finish, then the game continues.',
  '遺言結束，繼續':'Last words finished · Continue', '逐票記錄（可選）':'Record individual ballots (optional)',
  '請畫面指定的玩家發表遺言，其餘玩家請保持安靜。':'The player shown on screen may give their last words. Everyone else, please listen quietly.',
  '娛樂模式每種角色最多 15 位。':'Fun mode allows at most 15 players of any one role.',
  '娛樂模式':'Fun mode',
  '允許多位預言家、女巫及獵人；狼人仍須少於好人。':'Allow multiple seers, witches and hunters. Wolves must still be fewer than the good side.',
  '同角色按座位順序逐一操作，每位女巫有獨立藥水。':'Players sharing a role act privately in seat order. Each witch has her own potions.',
  '壞人陣營':'Bad side', '好人陣營':'Good side',
  '維持夜間掩護操作':'Keep up the night-time cover',
  '本回合不能使用能力。請照常選擇座位及按確認，避免點擊聲洩漏資訊。若沒有人操作，10 秒後自動繼續。':'You cannot use a power this turn. Choose a seat and confirm as usual to conceal clicking sounds. With no input, the turn continues automatically after 10 seconds.',
  '完成掩護操作':'Finish cover action',
  '已在現場點票？直接輸入結果':'Counted the votes in person? Enter the result',
  '選擇最高票玩家；平票請選全部最高票座位。不選代表無人出局。':'Select the highest-vote player, or all tied leaders. Leave all seats unselected for no elimination.',
  '不選擇座位＝無人出局。':'No selection means no elimination.',
  '再次平票：無人出局。':'Another tie: no elimination.',
  '確認現場點票結果':'Confirm counted result',
  '主持人已輸入現場點票結果。':'The host entered the votes counted in person.',
  '仍有可行動角色，請完成私人行動。':'This role can still act. Complete the private action.',
  '請選擇最高票座位。':'Choose the highest-vote seats.',
  '最高票座位不可重複。':'Highest-vote seats must not be repeated.',

  '請參閱字幕':'Please read the captions',
  'players at the table · 自動儲存進度':'Progress is saved automatically',
  '今晚的約定':'Tonight’s house rules',
  '允許狼人空刀':'Allow wolves to skip their kill',
  '語音語言':'Speech language', '聲線':'Voice',
  '女巫可以自救':'Witch may save herself',
  '女巫被刀當晚可行動':'Witch may act on the night she is killed',
  '狼人達到平票人數即勝':'Wolves win when they equal or outnumber the good team',
  '討論時間（秒）':'Discussion time (seconds)',
  '身份由系統隨機分配，每人私下查看自己的身份。':'Roles are assigned randomly. Each player checks their role privately.',
  '一部裝置，主持全場。另設安全的觀眾畫面。':'Host the whole game on one device, with a separate public audience view.',
  '設定角色，集結你的村莊。':'Choose the roles and gather your village.',
  '輪流揭開只屬於你的身份。':'Take turns privately revealing your own role.',
  '跟隨語音，尋找藏身的狼人。':'Follow the narration and find the hidden werewolves.',
  '天黑請閉眼，故事即將開始。':'Close your eyes. The story is about to begin.',
  '月落之前，誰可信任？':'Who can you trust before the moon sets?',
  '村莊紀事':'Village chronicle', '村莊座位':'Village seats',
  '身份':'Roles', '狼人':'Werewolf', '預言家':'Seer', '女巫':'Witch', '獵人':'Hunter', '平民':'Villager', '好人':'Good team',
  '天亮':'Dawn', '討論':'Discussion', '投票':'Vote',
  '身份交接':'Role handoff', '狼人行動':'Werewolf action', '女巫行動':'Witch action',
  '預言家查驗':'Seer investigation', '等待天亮':'Awaiting dawn',
  '獵人的最後一槍':'The hunter’s final shot', '白天討論':'Daytime discussion',
  '村莊公投':'Village vote', '平票加賽':'Tie-breaking vote', '月落，真相浮現':'The truth is revealed',
  '請將裝置交給指定座位。只有本人可以打開身份卡，確認後立即收起。':'Pass the device to the indicated seat. Only that player may reveal the role; hide it after confirming.',
  '所有人閉眼。只有狼人可以查看私人畫面，並共同選擇今晚的目標。':'Everyone closes their eyes. Only the werewolves view the private screen and choose tonight’s target together.',
  '狼人閉眼，女巫睜眼。請女巫私下決定是否使用藥物。':'Wolves close their eyes; the witch opens hers and privately decides whether to use a potion.',
  '女巫閉眼，預言家睜眼。查驗結果只會在私人畫面顯示。':'The witch closes her eyes; the seer opens theirs. Investigation results appear only on the private screen.',
  '所有夜間行動已鎖定。確認大家睜眼後，公布昨晚的結果。':'Night actions are locked. Once everyone opens their eyes, announce last night’s result.',
  '勝負尚未結算。獵人可以帶走一位存活玩家，或放棄開槍。':'Victory is not yet decided. The hunter may shoot a living player or decline.',
  '每個聲音都可能藏著線索。依座位發言，仔細聆聽，再作判斷。':'Every voice may hold a clue. Speak in seat order, listen carefully, then decide.',
  '依次記錄每位存活玩家的選擇。可以棄權，也可以投自己。':'Record each living player’s ballot. Abstaining and voting for yourself are allowed.',
  '只在平票玩家之間再投一次。若仍平票，今晚無人出局。':'Vote once more among tied players. A second tie means no elimination.',
  '所有秘密已經揭曉。回看每個座位的身份，拼出這一夜的故事。':'All secrets are revealed. Review every role and piece together the night’s story.',
  '觀眾畫面':'Audience view', '新遊戲':'New game', '觀眾':'Audience',
  '這是公開觀眾畫面。私人行動與查驗結果不會出現在這裡。每 3 秒同步。':'Public audience view. Private actions and investigations are hidden. Updates every 3 seconds.',
  '等待主持人推進遊戲。':'Waiting for the host to continue.',
  '私人畫面不會讀出秘密。':'Private information is never read aloud.',
  '切換分頁時會自動遮蔽。':'Private screens are hidden when you switch tabs.',
  '血月之下，請閉上眼睛。':'Under the moon, close your eyes.',
  '晨光已至，請睜開眼睛。':'Morning has arrived. Open your eyes.',
  '好人陣營勝利':'The good team wins', '狼人陣營勝利':'The werewolves win',
  '雙方全滅 · 平局':'Both teams eliminated · Draw',
  '月落之後，每個秘密都有了答案。完整身份與死亡原因已公開。':'Every secret now has an answer. All roles and causes of death are revealed.',
  '開始計時':'Start timer', '暫停計時':'Pause timer', '重設':'Reset', '時間到':'Time is up',
  '討論時間到。請主持人開始投票。':'Discussion time is up. The host may begin voting.',
  'DEBUG：略過討論倒數，可直接進入投票。':'DEBUG: skip the discussion timer and proceed directly to voting.',
  '跳過討論（DEBUG）':'Skip discussion (DEBUG)',
  '跳過身份交接（DEBUG）':'Skip role handoff (DEBUG)',
  '私下查看身份':'View your private role', '狼人私人行動':'Private werewolf action',
  '女巫私人行動':'Private witch action', '預言家私人行動':'Private seer action',
  '公布昨晚結果':'Announce last night’s result', '決定最後一槍':'Choose your final shot',
  '開始投票':'Begin voting', '記錄全體投票':'Record all ballots', '記錄加賽投票':'Record runoff ballots',
  '重播公開旁白':'Replay public narration',
  '讓大家看見村莊。':'Let everyone see the village.',
  '這個連結只顯示公開資訊。請在另一個視窗打開，或複製給觀眾。另一部裝置需要可連線的伺服器網址。':'This link shows public information only. Open it in another window or share it with the audience. Other devices require a reachable server address.',
  '觀眾專用連結':'Audience-only link', '複製連結':'Copy link',
  '另開觀眾畫面':'Open audience view', '在此分頁預覽':'Preview in this tab', '返回主持畫面':'Back to host view',
  '觀眾連結已複製。':'Audience link copied.', '請手動複製已選取的連結。':'Please copy the selected link manually.',
  '開一局新遊戲？':'Start a new game?',
  '目前遊戲會保留在伺服器，但這個分頁將開始新局。要保留舊局的操作權，請先保留目前分頁。':'The current game stays on the server, but this tab will start a new one. Keep a copy of this tab first if you need to retain access to the old game.',
  '繼續本局':'Continue this game', '開新局':'Start new game',
  '請先讓其他人移開視線，再揭開私人資訊。':'Ask everyone else to look away before revealing private information.',
  '我已準備好 · 揭開':'I’m ready · Reveal', '返回公開畫面':'Back to public view', '返回':'Back',
  '記住了 · 收起並交給下一位':'Got it · Hide and pass to the next player',
  '你藏身於村莊之中。與同伴一起活到最後。':'You are hidden among the villagers. Survive with your fellow werewolves.',
  '守護村莊，找出藏在你們之間的狼人。':'Protect the village and uncover the werewolves among you.',
  '今晚，誰將消失？':'Who will disappear tonight?',
  '可以空刀，亦可選狼人。':'You may skip the kill or choose a werewolf.',
  '本局不允許空刀，必須選擇一位存活玩家。':'Skipping the kill is disabled. Choose a living target.',
  '鎖定目標 · 收起畫面':'Lock target · Hide screen', '不選擇目標 / 放棄':'No target / Pass',
  '一瓶藥，一個決定。':'One potion. One decision.',
  '今晚沒有狼人擊殺目標。':'The werewolves chose no target tonight.',
  '每晚最多用一瓶。解藥只能救狼人目標；毒藥可選任意存活玩家。':'Use at most one potion per night. The antidote saves the wolves’ target; poison may target any living player.',
  '本晚沒有可行動的女巫，請維持相同交接流程。':'No witch can act tonight. Continue the same private handoff routine.',
  '使用解藥，救回今晚被刀玩家':'Use the antidote to save tonight’s wolf target',
  '本晚解藥不可用。':'The antidote is unavailable tonight.', '本晚毒藥不可用。':'Poison is unavailable tonight.',
  '毒藥目標（可放棄）':'Poison target (optional)', '確認用藥決定 · 收起畫面':'Confirm potion choice · Hide screen',
  '每晚只可使用一瓶藥。請取消解藥或毒藥目標。':'Use only one potion per night. Deselect either the antidote or the poison target.',
  '今晚沒有可行動的預言家。':'No seer can act tonight.',
  '請維持相同交接流程，確認後關閉私人畫面。':'Continue the same handoff routine, then confirm and hide the private screen.',
  '確認 · 收起畫面':'Confirm · Hide screen', '迷霧之後的真相。':'The truth beyond the mist.',
  '請記住結果。確認後即清除畫面。':'Remember the result. Confirming clears the screen.',
  '確認結果 · 收起畫面':'Confirm result · Hide screen', '你想看穿誰？':'Whose secret will you uncover?',
  '選一位其他存活玩家。結果只會告訴你陣營。':'Choose another living player. Only their team will be revealed.',
  '查驗身份':'Investigate player', '你可以帶走一位存活玩家，或放棄開槍。':'Shoot one living player, or decline your shot.',
  '確認最後決定':'Confirm final choice',
  '先核對每人的選擇，再一次提交。空白代表棄權。':'Check everyone’s choice before submitting all ballots. A blank choice means abstain.',
  '棄權':'Abstain', '確認全體投票':'Confirm all ballots',
  '原版廣東話女聲':'Original Cantonese female', '廣東話男聲（較慢）':'Cantonese male (slower)',
  '允許本機備用語音（較機械）':'Allow local fallback voice (less natural)',
  '語音已啟用':'Voice enabled', '語音關閉 · 可按右上角啟用':'Voice off · Enable it at the top right',
  '語音關閉 · 字幕仍然顯示':'Voice off · Captions remain visible',
  '使用已快取語音…':'Using cached audio…', '正在準備廣東話神經語音…':'Preparing Cantonese neural audio…',
  '神經語音播放完畢 · 重播已快取':'Neural playback finished · Replay is cached',
  '語音已停止，請參閱字幕':'Audio stopped. Please read the captions.',
  '語音已備妥，請再按重播以允許播放':'Audio is ready. Click replay again to allow playback.',
  '神經語音暫時未能連線 · 未切換本機聲線，請參閱字幕':'Neural service unavailable. Local fallback is off; please read the captions.',
  '語音暫時不可用 · 請參閱字幕':'Audio unavailable · Please read the captions',
  '本機備用語音播放完畢（並非原版神經聲線）':'Local fallback finished (not the original neural voice)',
  '請參閱字幕 · 語音未能播放':'Audio could not play · Please read the captions',
  '原版廣東話神經女聲':'Original Cantonese neural female', '廣東話神經男聲':'Cantonese neural male',
  '正在載入主持人身份表…':'Loading the host’s role sheet…', '主持人專用':'Host only',
  'DEBUG 尚未載入：伺服器可能仍在執行舊版本。請重新啟動 Python 伺服器，再重試。':'DEBUG is unavailable. The backend may be outdated; restart the Python server and retry.',
  '重試 DEBUG':'Retry DEBUG', '存活':'Alive', '夜晚出局':'Killed at night', '被毒殺':'Poisoned', '公投出局':'Voted out', '被獵人帶走':'Shot by the hunter',
  '暫時未能連上村莊。':'The village is temporarily unreachable.', '重新連線':'Reconnect', '返回首頁':'Back to home',
  '請檢查輸入，再試一次。':'Check your input and try again.',
  '連線逾時，請檢查網絡並重新同步。':'Connection timed out. Check your network and synchronize again.',
  '村莊已集結。身份分配完成。':'The village is assembled. Roles have been assigned.',
  '好人陣營勝利。身份已公開。':'The good team wins. All roles are revealed.',
  '夜幕再次降臨。':'Night falls again.', '昨晚是平安夜。':'Nobody died last night.',
  '所有狼人已出局。好人陣營勝利。':'All werewolves are eliminated. The good team wins.',
  '狼人陣營勝利。':'The werewolves win.', '雙方同時全滅，平局。':'Both teams were eliminated simultaneously. It is a draw.',
  '投票平票，進入一次加賽。':'The vote is tied. Proceed to one runoff.',
  '平票或全體棄權，本輪無人出局。':'A tie or unanimous abstention means no elimination this round.',
  '入夜前，先講清規矩。':'Agree on the rules before night falls.',
  '狼人每晚共同選一個目標，是否可以空刀依開局設定。預言家每晚查驗一人，不能查自己。女巫全局各有一瓶解藥及毒藥，每晚最多用一瓶；預設不能自救，被刀當晚仍可行動。':'Wolves choose one target each night; skipping depends on the house rule. The seer checks one other player. The witch has one antidote and one poison per game, using at most one per night. By default she cannot save herself but may act when killed that night.',
  '獵人被刀、投票或槍殺可開槍，被毒不能開槍。所有死亡及獵人行動完成後，才判定勝負。狼人全滅則好人勝；預設狼人數目不少於好人則狼人勝。雙方同時全滅為平局。':'The hunter may shoot after a wolf kill, vote, or hunter shot, but not after poisoning. Resolve all deaths and hunter actions before checking victory. The good team wins when all wolves die; by default wolves win at parity. Simultaneous elimination of both teams is a draw.',
  '每位存活玩家一票，可棄權、可以自投。平票者加賽一次，再平票或全體棄權則無人出局。':'Each living player gets one vote, may abstain, and may vote for themselves. Tied players face one runoff. Another tie or all abstentions means no elimination.',
  '這是同場遊戲的主持工具。私人畫面只交給指定角色查看。觀眾請使用「觀眾畫面」，不要分享主持人的瀏覽器。':'This tool hosts an in-person game. Only the designated role may view a private screen. Spectators should use the audience view, never the host browser.',
  '歡迎來到狼人殺。請各位玩家依次查看自己的身份。':'Welcome to Werewolf. Take turns privately checking your role.',
  '天黑請閉眼。狼人請睜眼，選擇今晚的目標。':'Night falls. Everyone closes their eyes. Wolves, open your eyes and choose tonight’s target.',
  '狼人請閉眼。女巫請睜眼，確認今晚的資訊，決定是否使用藥物。':'Wolves, close your eyes. Witch, open your eyes, review tonight’s information, and choose whether to use a potion.',
  '女巫請閉眼。預言家請睜眼，選擇查驗的玩家。':'Witch, close your eyes. Seer, open your eyes and choose a player to investigate.',
  '預言家請閉眼。天亮了，所有玩家請睜眼。':'Seer, close your eyes. Morning has arrived. Everyone, open your eyes.',
  '獵人請決定是否開槍。':'Hunter, decide whether to shoot.',
  '現在開始日間討論。請各位玩家依次發言。':'Daytime discussion begins. Please speak in seat order.',
  '現在開始投票。請投出你懷疑是狼人的玩家，亦可以棄權。':'Voting begins. Vote for a suspected werewolf or abstain.',
  '本輪平票。請在平票玩家之間再投一次。':'The vote is tied. Vote again among the tied players.',
  '遊戲結束。請查看勝方與完整復盤。':'The game is over. View the winner and full recap.',
  '請設定全部五種角色。':'Configure all five role types.',
  '角色人數必須是 0–16 的整數。':'Role counts must be whole numbers from 0 to 16.',
  '每局需要 5–16 位玩家。':'A game requires 5–16 players.',
  '至少一位狼人，而且開局狼人必須少於好人。':'Include at least one wolf, with fewer wolves than good players at the start.',
  '預言家、女巫及獵人各最多一位。':'Use at most one seer, witch, and hunter.',
  '未知規則。':'Unknown rule.', '規則開關必須是布林值。':'Rule switches must be true or false.',
  '討論時間須為 15–600 秒。':'Discussion time must be 15–600 seconds.',
  '無效座位。':'Invalid seat.', '請選擇目標。':'Choose a target.',
  '請選擇有效的存活目標。':'Choose a valid living target.', '遊戲已結束。':'The game has finished.',
  '未知行動。':'Unknown action.', '未知行動參數。':'Unknown action parameter.',
  '無效的解藥選項。':'Invalid antidote choice.', '本晚不能使用解藥。':'The antidote cannot be used tonight.',
  '本晚不能使用毒藥。':'Poison cannot be used tonight.', '每晚只可使用一瓶藥。':'Only one potion may be used per night.',
  '本晚已完成查驗。':'The investigation is already complete tonight.', '沒有可行動的預言家。':'No seer can act.',
  '請先查驗，並確認結果。':'Investigate and acknowledge the result first.',
  '必須記錄每位存活玩家的一票（或棄權）。':'Record a vote or abstention for every living player.',
  '加賽只可投平票玩家。':'Only tied players may receive runoff votes.',
  '此行動不適用於目前階段。':'This action is not available in the current phase.',
  '需要遊戲通行證。':'A game access token is required.', '未知的公開語音。':'Unknown public narration cue.',
  '語音暫時不可用，請使用畫面字幕。':'Audio is unavailable. Please use the on-screen captions.',
  '找不到遊戲。':'Game not found.', '無效的遊戲通行證。':'Invalid game access token.',
  '只有主持人可以操作。':'Only the host may perform this action.',
  '畫面已過時，已重新同步。請確認目前階段後再操作。':'This view was outdated and has been synchronized. Check the current phase before trying again.'
};

const roles = {壞人陣營:'Bad side',好人陣營:'Good side',狼人:'Werewolf',預言家:'Seer',女巫:'Witch',獵人:'Hunter',平民:'Villager',好人:'Good team'};
const list = value => value.replace(/、/g, ', ');
const available = value => value === '無' ? 'none' : `seat ${value}`;

export function englishFor(value) {
  const text = value.trim().replace(/^[↻↩↗＋]\s*/, '').replace(/\s*[↗→]$/, '').replace(/^\/\s*/, '');
  if (COPY[text]) return COPY[text];
  let m;
  if ((m=text.match(/^(\d+) 號遺言結束。$/))) return `Seat ${m[1]} has finished their last words.`;
  if ((m=text.match(/^被獵人 (\d+) 號帶走$/))) return `Shot by hunter ${m[1]}`;
  if ((m=text.match(/^現場結果：(\d+) 號出局。$/))) return `Counted result: seat ${m[1]} is eliminated.`;
  if ((m=text.match(/^平票：([\d、]+) 號進入加賽。$/))) return `Tie: seats ${list(m[1])} enter a runoff.`;

  if ((m=text.match(/^(\d+) 人局$/))) return `${m[1]} players`;
  if ((m=text.match(/^第 (\d+) (晚|輪)$/))) return `${m[2]==='晚'?'Night':'Round'} ${m[1]}`;
  if ((m=text.match(/^(\d+) 號玩家投給$/))) return `Seat ${m[1]} votes for`;
  if ((m=text.match(/^(\d+) 號$/))) return `Seat ${m[1]}`;
  if ((m=text.match(/^(\d+) 號 · (狼人|預言家|女巫|獵人|平民)$/))) return `Seat ${m[1]} · ${roles[m[2]]}`;
  if ((m=text.match(/^現在輪到 (\d+) 號玩家。其他人請移開視線。$/))) return `Seat ${m[1]} is next. Everyone else, look away.`;
  if ((m=text.match(/^確認只有(.+)在看畫面。$/))) return `Confirm that only ${roles[m[1]] || m[1].replace(/(\d+) 號玩家/, 'player $1').replace(/(\d+) 號獵人/, 'hunter $1')} is viewing the screen.`;
  if ((m=text.match(/^你的狼人同伴：([\d、]+) 號。(.*)$/))) return `Fellow wolves: seats ${list(m[1])}. ${englishFor(m[2]) || ''}`;
  if ((m=text.match(/^今晚被刀：(\d+) 號$/))) return `Tonight’s wolf target: seat ${m[1]}`;
  if ((m=text.match(/^你查驗了 (\d+) 號$/))) return `You investigated seat ${m[1]}`;
  if ((m=text.match(/^獵人 (\d+) 號的最後一槍。$/))) return `Hunter ${m[1]}’s final shot.`;
  if ((m=text.match(/^獵人：(\d+) 號$/))) return `Hunter: seat ${m[1]}`;
  if ((m=text.match(/^平票座位：([\d、]+) 號$/))) return `Tied seats: ${list(m[1])}`;
  if ((m=text.match(/^昨晚 (.+) 出局。$/))) return `Eliminated last night: seats ${(m[1].match(/\d+/g)||[]).join(', ')}.`;
  if ((m=text.match(/^公投結果：(\d+) 號出局。$/))) return `Vote result: seat ${m[1]} is eliminated.`;
  if ((m=text.match(/^獵人 (\d+) 號開槍，(\d+) 號出局。$/))) return `Hunter ${m[1]} shoots. Seat ${m[2]} is eliminated.`;
  if ((m=text.match(/^獵人 (\d+) 號放棄開槍。$/))) return `Hunter ${m[1]} declines the shot.`;
  if ((m=text.match(/^解藥：(已使用|未使用) · 毒藥：(已使用|未使用)$/))) return `Antidote: ${m[1]==='已使用'?'used':'available'} · Poison: ${m[2]==='已使用'?'used':'available'}`;
  if ((m=text.match(/^本晚狼刀：(\d+|無) · 毒藥目標：(\d+|無)(?: · 查驗：(\d+) 號（(狼人|好人|壞人陣營|好人陣營)）)?$/))) return `Wolf target: ${available(m[1])} · Poison target: ${available(m[2])}${m[3]?` · Investigation: seat ${m[3]} (${roles[m[4]]})`:''}`;
  if ((m=text.match(/^DEBUG · (.+)$/))) return `DEBUG · ${englishFor(m[1]) || m[1]}`;
  if ((m=text.match(/^正在播放 · (.+) · 重播無需下載$/))) return `Playing · ${englishFor(m[1]) || m[1]} · No download needed for replay`;
  if ((m=text.match(/^正在播放 · 本機備用(英語|廣東話)（並非原版神經聲線）$/))) return `Playing · Local ${m[1]==='英語'?'English':'Cantonese'} fallback (not the original neural voice)`;
  return null;
}

/** Inserts translations alongside existing text, only inside the supplied subtree. */
export function bilingualize(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest('[lang="en"],.english-subtext,.seat,.role-card,.table-top,script,style,svg,textarea')) continue;
    if (!/[\u3400-\u9fff]/u.test(node.nodeValue)) continue;
    const translation = englishFor(node.nodeValue);
    if (!translation) continue;
    if (parent.tagName === 'OPTION') { node.nodeValue += ` · ${translation}`; continue; }
    if (node.nextSibling?.classList?.contains('english-subtext')) continue;
    const line = document.createElement('span');
    line.className = 'english-subtext'; line.lang = 'en'; line.textContent = translation;
    if (parent.tagName === 'LABEL') {
      const copy = document.createElement('span');
      copy.className = 'bilingual-label'; node.replaceWith(copy); copy.append(node,line);
    } else node.after(line);
  }
}

export function setBilingualText(element, text) {
  element.textContent = text;
  bilingualize(element);
}
