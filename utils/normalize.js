function normalizeFacebookEvent(entry) {
  const events = [];

  // PAGE FEED EVENTS
  if (entry.changes) {
    for (const change of entry.changes) {
      // chỉ xử lý feed
      if (change.field === "feed") {
        const value = change.value || {};

        events.push({
          source: "facebook",

          // post | comment
          type: value.item || "feed",

          page_id: value.page_id,

          post_id: value.post_id,
          comment_id: value.comment_id,

          verb: value.verb,

          // nội dung comment/post
          message: value.message || "",

          // ===== THÊM 2 FIELD NÀY =====
          sender_id: value.from?.id || null,
          sender_name: value.from?.name || null,

          created_time: value.created_time || new Date().toISOString(),

          raw: value,
        });
      }
    }
  }

  return events;
}

module.exports = {
  normalizeFacebookEvent,
};
