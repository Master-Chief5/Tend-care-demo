// screens-a-onboard-chat.jsx — Orientation flow + Team chat

const CHAT_DATA = {
  oak: {
    name: '# Oak House', members: 'Aisha, Jay, Carmen, Lina',
    color: HOUSES[0].color, short: HOUSES[0].short,
    messages: [
      { who: 'Aisha M.', time: '8:12 AM', text: 'Morning all — R. Johnson had a rough night, going to call mom around 9.' },
      { who: 'Lina (you)', time: '8:15 AM', me: true, text: 'Thx Aisha. Note in the chart? Will loop in Dr. Patel if needed.' },
      { who: 'Aisha M.', time: '8:16 AM', text: "Note's in. Will keep you posted." },
      { who: 'Aisha M.', time: '9:08 AM', text: 'Mom called back — she is coming for lunch. Also we are out of oat milk + bananas.' },
    ],
  },
  willow: {
    name: '# Willow Run', members: 'Devon, Theo, Lina',
    color: HOUSES[1].color, short: HOUSES[1].short,
    messages: [
      { who: 'Devon P.', time: '7:44 AM', text: 'Need a fill-in for Wed 3–11 — any takers? Offering weekend swap.' },
      { who: 'Lina (you)', time: '8:02 AM', me: true, text: "I'll post to the group. Keep me posted on coverage." },
    ],
  },
  maple: {
    name: '# Maple Run', members: 'Saira, Marcus, Reni, Lina',
    color: HOUSES[2].color, short: HOUSES[2].short,
    messages: [
      { who: 'Saira K.', time: '9:30 AM', text: 'Dryer guy coming Thu morning — I booked Theo to cover Marcus.' },
      { who: 'Lina (you)', time: '9:35 AM', me: true, text: 'Perfect, thanks Saira.' },
    ],
  },
  cedar: {
    name: '# Cedar Ridge', members: 'Tomas, Priya, Lina',
    color: HOUSES[3].color, short: HOUSES[3].short,
    messages: [
      { who: 'Tomas R.', time: 'Mon 4p', text: 'All set for the week. Priya confirmed swap for Saturday.' },
    ],
  },
  carmen: {
    name: 'Carmen Vela', members: 'Direct message',
    color: 'var(--a-ink2)', short: 'CV',
    messages: [
      { who: 'Carmen V.', time: 'Sun', text: 'Hey Lina, where do I park on Monday?' },
      { who: 'Lina (you)', time: 'Sun', me: true, text: 'Back lot — the gate code is 4821. See you at 7!' },
    ],
  },
  marcus: {
    name: 'Marcus Lewis', members: 'Direct message',
    color: 'var(--a-ink2)', short: 'ML',
    messages: [
      { who: 'Marcus L.', time: 'Sat', text: 'Sorry about being late again, I will explain.' },
      { who: 'Lina (you)', time: 'Sat', me: true, text: "Let's talk Monday morning before your shift." },
    ],
  },
};

// ── Orientation screen (for new hire) ──────────────────────────────────
function ScreenA_Orientation() {
  const [openWeek, setOpenWeek] = useState(1);

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={{ background: 'transparent', border: 0, padding: 4, color: 'var(--a-ink2)', cursor: 'pointer' }}><IconChev size={20} sw={2} style={{ transform: 'rotate(180deg)' }} /></button>
          <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>Day 6 of 30</span>
          <span style={{ fontSize: 12, color: 'var(--a-sage)', fontWeight: 500 }}>20%</span>
        </div>

        <div style={{ padding: '8px 22px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconLeaf size={14} color="var(--a-sage)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-sage)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Your roots, week 1</span>
          </div>
          <div className="serif" style={{ fontSize: 28, lineHeight: 1.05, marginTop: 6, letterSpacing: '-0.02em' }}>
            Welcome, <em style={{ fontStyle: 'italic', color: 'var(--a-clay)' }}>Carmen</em>.<br />Let's get you ready.
          </div>
          <div style={{ height: 6, background: 'var(--a-paper)', borderRadius: 999, marginTop: 14, overflow: 'hidden' }}>
            <div style={{ width: '20%', height: '100%', background: 'var(--a-sage)' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 6 }}>Self-paced — your mentor Lina will check in each Friday.</div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 22px 24px' }}>
          <WeekSection num={1} title="Find your footing" done={3} total={5} open={openWeek === 1} onToggle={() => setOpenWeek(openWeek === 1 ? null : 1)}>
            <Step done title="Welcome video" sub="From owner · 4 min" type="video" />
            <Step done title="Meet your mentor — Lina" sub="Booked: Mon 9am · Oak House" type="cal" />
            <Step done title="House walkthrough — Oak" sub="Done with Aisha · 5/22" type="walk" />
            <Step active title="Read: Resident profiles" sub="6 residents · ~15 min" type="read" />
            <Step title="Shadow shift #1" sub="Schedule with Aisha" type="shadow" />
          </WeekSection>

          <WeekSection num={2} title="On the floor" done={0} total={6} open={openWeek === 2} onToggle={() => setOpenWeek(openWeek === 2 ? null : 2)} />
          <WeekSection num={3} title="Medications & docs" done={0} total={5} open={openWeek === 3} onToggle={() => setOpenWeek(openWeek === 3 ? null : 3)} />
          <WeekSection num={4} title="Solo + sign-off" done={0} total={4} open={openWeek === 4} onToggle={() => setOpenWeek(openWeek === 4 ? null : 4)} />

          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 14px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--a-clay)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>L</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Lina is your mentor</div>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>Friday check-in · Fri 3pm</div>
            </div>
            <button style={{ background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '6px 12px', fontSize: 11.5, fontWeight: 500, color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <IconChat size={13} sw={1.7} /> Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekSection({ num, title, done, total, children, open, onToggle }) {
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: done === total ? 'var(--a-sage)' : 'var(--a-paper)', color: done === total ? '#fff' : 'var(--a-ink2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, border: '1.5px solid ' + (done === total ? 'var(--a-sage)' : 'var(--a-line)') }}>
          {num}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Week {num} · {title}</div>
          <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{done}/{total} complete</div>
        </div>
        <IconChev size={16} color="var(--a-ink3)" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
      </div>
      {open && children && (
        <div style={{ paddingLeft: 36, marginTop: 8, borderLeft: '1px dashed var(--a-line)', marginLeft: 13 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Step({ title, sub, done, active, type }) {
  const icoMap = { video: IconPlay, cal: IconCal, walk: IconHome, read: IconBook, shadow: IconPeople };
  const Ico = icoMap[type] || IconCheck;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 8px 8px', position: 'relative' }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: done ? 'var(--a-sage)' : active ? '#fff' : 'var(--a-paper)', border: '1.5px solid ' + (done ? 'var(--a-sage)' : active ? 'var(--a-clay)' : 'var(--a-line)'), color: done ? '#fff' : active ? 'var(--a-clay)' : 'var(--a-ink3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {done ? <IconCheck size={12} sw={2.4} color="#fff" /> : <Ico size={12} sw={2} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: done ? 'var(--a-ink3)' : 'var(--a-ink)', fontWeight: active ? 600 : 500, textDecoration: done ? 'line-through' : 'none' }}>{title}</div>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{sub}</div>
      </div>
      {active && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--a-clay)', background: '#fadcd7', padding: '2px 6px', borderRadius: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Next</span>}
    </div>
  );
}

// ── Team chat ──────────────────────────────────────────────────────────
function ScreenA_Chat() {
  const [selectedChannel, setSelectedChannel] = useState(null);

  if (selectedChannel) {
    const ch = CHAT_DATA[selectedChannel];
    return <ChatThread channel={ch} onBack={() => setSelectedChannel(null)} />;
  }

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Team chat</div>
          <button style={{ background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--a-ink2)', cursor: 'pointer' }}>
            <IconPlus size={14} sw={2.2} />
          </button>
        </div>

        <div style={{ padding: '0 22px 10px' }}>
          <div style={{ background: 'var(--a-paper)', borderRadius: 999, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--a-line)' }}>
            <IconSearch size={13} color="var(--a-ink3)" />
            <input placeholder="Search messages" style={{ background: 'transparent', border: 0, outline: 0, flex: 1, fontSize: 12.5, fontFamily: 'Geist', color: 'var(--a-ink2)' }} />
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 0 16px' }}>
          <div style={{ margin: '4px 22px 12px', padding: '10px 14px', background: '#f5e9d6', borderRadius: 12, border: '1px solid #e7d289' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <IconFlag size={11} color="#a47012" sw={2.2} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#a47012', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pinned · all houses</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--a-ink2)', lineHeight: 1.4 }}>State inspection Thursday — please review the prep checklist by Wed end-of-shift.</div>
          </div>

          <SectionLabel>House channels</SectionLabel>
          <ChatRow house="oak"    lastFrom="Aisha" preview="Got the oat milk + bananas, heading back" time="3m"  unread={2} onClick={() => setSelectedChannel('oak')} />
          <ChatRow house="willow" lastFrom="Devon" preview="Need a fill-in for Wed 3-11 — any takers?" time="22m" unread={1} onClick={() => setSelectedChannel('willow')} />
          <ChatRow house="maple"  lastFrom="Saira" preview="Dryer guy coming Thu morning" time="1h" onClick={() => setSelectedChannel('maple')} />
          <ChatRow house="cedar"  lastFrom="Tomas" preview="All set for the week" time="3h" onClick={() => setSelectedChannel('cedar')} />

          <SectionLabel>Direct messages</SectionLabel>
          <ChatRow dm name="Carmen Vela"  preview="Hey Lina, where do I park on Mon?" time="Sun" unread={1} onClick={() => setSelectedChannel('carmen')} />
          <ChatRow dm name="Marcus Lewis" preview="Sorry about being late again" time="Sat" onClick={() => setSelectedChannel('marcus')} />
        </div>
      </div>
      <TabBar active="team" />
    </div>
  );
}

function ChatThread({ channel, onBack }) {
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState(channel.messages);

  const send = () => {
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { who: 'Lina (you)', time: 'Now', me: true, text: msg.trim() }]);
    setMsg('');
  };

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--a-line)' }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 0, padding: 4, color: 'var(--a-ink2)', cursor: 'pointer' }}>
            <IconChev size={20} sw={2} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: channel.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>{channel.short}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{channel.name}</div>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{channel.members}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, flexDirection: m.me ? 'row-reverse' : 'row' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.me ? 'var(--a-clay)' : channel.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 11, flexShrink: 0 }}>{m.who[0]}</div>
              <div style={{ maxWidth: '75%' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3, flexDirection: m.me ? 'row-reverse' : 'row' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600 }}>{m.who}</span>
                  <span style={{ fontSize: 10, color: 'var(--a-ink3)' }}>{m.time}</span>
                </div>
                <div style={{ background: m.me ? 'var(--a-ink)' : 'var(--a-card)', color: m.me ? '#fbf6ec' : 'var(--a-ink)', padding: '8px 12px', borderRadius: 10, border: m.me ? 0 : '1px solid var(--a-line)', fontSize: 13, lineHeight: 1.45 }}>{m.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '10px 22px 14px', borderTop: '1px solid var(--a-line)' }}>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              placeholder={`Message ${channel.name}…`}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              style={{ background: 'transparent', border: 0, outline: 0, flex: 1, fontSize: 13, fontFamily: 'Geist', color: 'var(--a-ink)' }}
            />
            <button onClick={send} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 7, padding: '5px 10px', fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>Send</button>
          </div>
        </div>
      </div>
      <TabBar active="team" />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ padding: '8px 22px 4px', fontSize: 10.5, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

function ChatRow({ house, lastFrom, preview, time, unread, dm, name, onClick }) {
  const h = house ? HOUSES.find(x => x.id === house) : null;
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 22px', borderBottom: '1px solid var(--a-line)', cursor: 'pointer' }}>
      {h ? (
        <div style={{ width: 38, height: 38, borderRadius: 10, background: h.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0 }}>{h.short}</div>
      ) : (
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--a-paper)', color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, flexShrink: 0, border: '1px solid var(--a-line)' }}>{name?.[0]}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: unread ? 700 : 600 }}>{h ? `# ${h.name}` : name}</span>
          <span style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{time}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {lastFrom && <span style={{ color: 'var(--a-ink2)', fontWeight: 500 }}>{lastFrom}: </span>}
          {preview}
        </div>
      </div>
      {unread > 0 && <div style={{ background: 'var(--a-clay)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999 }}>{unread}</div>}
    </div>
  );
}

Object.assign(window, { ScreenA_Orientation, WeekSection, Step, ScreenA_Chat, ChatThread, SectionLabel, ChatRow, CHAT_DATA });
