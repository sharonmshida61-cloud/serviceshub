// WhatsApp splits its reaction panel the same way: a wall of emoji, then a
// sticker pack. The stickers are images; emoji are plain text the sender
// types into the message, so they live next to each other but behave apart.

export const EMOJI_GROUPS = [
  {
    key: "smileys",
    label: "Smileys",
    items: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "😋", "😛", "😜", "🤪", "😝", "🤗", "🤭", "🤔", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😌", "😔", "😟", "😕", "🧐", "😲", "😳", "🥺", "😢", "😭", "😤", "😠", "😡", "🤯", "😱", "😨", "😰", "😥", "😓", "🤤", "😴", "🥳", "🤓", "😎", "🤒", "🤕"],
  },
  {
    key: "gestures",
    label: "Gestures",
    items: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "👏", "🙌", "🙏", "💪", "👋", "🤝", "✋", "🖖", "👇", "👆", "👈", "👉", "☝️", "✊", "🤛", "🤜", "👀", "🧠", "🫤"],
  },
  {
    key: "hearts",
    label: "Hearts",
    items: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️"],
  },
  {
    key: "things",
    label: "Things",
    items: ["🎉", "🎊", "✨", "🔥", "💯", "⭐", "🌟", "⚡", "💤", "🎈", "🎁", "🏆", "🥇", "✅", "❌", "❓", "❗", "💬", "📞", "📍", "🚗", "🏠", "⏰", "📅", "💵", "🧾", "🔧", "🧹", "🍽️", "☕", "🧴", "📦"],
  },
];

// Bundled with the app, so a sticker message only ever carries one of these
// paths — the server checks the same shape before it stores one.
export const STICKERS = [
  { file: "happy", label: "Happy" },
  { file: "laugh", label: "Laughing" },
  { file: "wink", label: "Wink" },
  { file: "love", label: "In love" },
  { file: "cool", label: "Cool" },
  { file: "wow", label: "Surprised" },
  { file: "sad", label: "Sad" },
  { file: "party", label: "Celebration" },
];

export const stickerUrl = (file) => `/stickers/${file}.svg`;
