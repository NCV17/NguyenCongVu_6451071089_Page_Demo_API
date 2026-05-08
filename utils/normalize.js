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
          type: value.item || "feed",

          page_id: value.page_id,

          post_id: value.post_id,
          comment_id: value.comment_id,

          verb: value.verb,

          message: value.message,

          created_time: value.created_time,

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
