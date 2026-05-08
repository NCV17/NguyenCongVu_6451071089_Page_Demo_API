const express = require("express");
const axios = require("axios");
const router = express.Router();

/*
====================================
CONFIG
====================================
*/

const PAGE_ACCESS_TOKEN =
  "EAAPuZCzuAYhUBRb7ZAjrmZALZC0ar5gPCQ6tFunuWMawkVYwo4ZAzy7IZCCBOCi1XS5SaLWelezIvp1A0vaCmrxtLiIZCpZBCnKPLIbqE2qGLcGuKngLiQG06zhZAXCcsjGMLCuzuHuz5GOMpXB5q6dq7F1m9MUcg1agYLTjqHZCi7YSEooF4RPP7qYMC4OeSD4G42kZAovUBL2nbc1evijapI5QjSNxHSjHixYbPABJ6QZDEAAhwIXpfd8EBRGA2ZCcr4ZAZBcSVrbeZCGAs0LcPHws7P4pRiILuzdpyGa2a49v13qpzpTkj4YHA8FdHKMZBQpvpTEj4e4F5ais3TlzT8jOefr2nLcxHbbwB82AsingCzeVFit2nBZCAINOSZBJPQY3aWdvJBZBkpRYo0ZAEeQtcivmQJFEnIqTj0xg4LNKRBtYsmZBL4etUX9nSXhGuN3JtAZBpBGUZA6Yr6ZCBa5pH08lursssZD";
/*
Ví dụ:
EAAhwIXxxxxxxxxxxxxxxxxxxxx
*/

const GRAPH_VERSION = "v25.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

/*
====================================
GET /api/page/:pageId
Lấy thông tin Page
====================================
*/

router.get("/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;

    const url = `${BASE_URL}/${pageId}`;

    const response = await axios.get(url, {
      params: {
        fields: "id,name,fan_count,followers_count",
        access_token: PAGE_ACCESS_TOKEN,
      },
    });

    res.json({
      success: true,
      message: "Lấy thông tin Page thành công",
      data: response.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
});

/*
====================================
GET /api/page/:pageId/posts
Lấy danh sách bài viết
====================================
*/

router.get("/:pageId/posts", async (req, res) => {
  try {
    const { pageId } = req.params;

    const url = `${BASE_URL}/${pageId}/posts`;

    const response = await axios.get(url, {
      params: {
        fields: "id,message,created_time",
        access_token: PAGE_ACCESS_TOKEN,
      },
    });

    res.json({
      success: true,
      message: "Lấy danh sách bài viết thành công",
      data: response.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
});

/*
====================================
POST /api/page/:pageId/posts
Đăng bài viết mới
Body:
{
   "message": "Hello Facebook"
}
====================================
*/

router.post("/:pageId/posts", async (req, res) => {
  try {
    const { pageId } = req.params;
    const { message } = req.body;

    const url = `${BASE_URL}/${pageId}/feed`;

    const response = await axios.post(url, null, {
      params: {
        message,
        access_token: PAGE_ACCESS_TOKEN,
      },
    });

    res.json({
      success: true,
      message: "Đăng bài viết thành công",
      data: response.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
});

/*
====================================
DELETE /api/page/post/:postId
Xóa bài viết
====================================
*/

router.delete("/post/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    const url = `${BASE_URL}/${postId}`;

    const response = await axios.delete(url, {
      params: {
        access_token: PAGE_ACCESS_TOKEN,
      },
    });

    res.json({
      success: true,
      message: "Xóa bài viết thành công",
      data: response.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
});

/*
====================================
GET /api/page/post/:postId/comments
Lấy comments
====================================
*/

router.get("/post/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;

    const url = `${BASE_URL}/${postId}/comments`;

    const response = await axios.get(url, {
      params: {
        fields: "id,message,from,created_time",
        access_token: PAGE_ACCESS_TOKEN,
      },
    });

    res.json({
      success: true,
      message: "Lấy comments thành công",
      data: response.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
});

/*
====================================
GET /api/page/post/:postId/likes
Lấy likes
====================================
*/

router.get("/post/:postId/likes", async (req, res) => {
  try {
    const { postId } = req.params;

    const url = `${BASE_URL}/${postId}/likes`;

    const response = await axios.get(url, {
      params: {
        access_token: PAGE_ACCESS_TOKEN,
      },
    });

    res.json({
      success: true,
      message: "Lấy likes thành công",
      data: response.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
});

/*
====================================
GET /api/page/:pageId/insights
Lấy insights
====================================
*/

router.get("/:pageId/insights", async (req, res) => {
  try {
    const { pageId } = req.params;

    const url = `${BASE_URL}/${pageId}/insights`;

    const response = await axios.get(url, {
      params: {
        metric: "page_impressions,page_engaged_users",
        access_token: PAGE_ACCESS_TOKEN,
      },
    });

    res.json({
      success: true,
      message: "Lấy insights thành công",
      data: response.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
});

module.exports = router;
