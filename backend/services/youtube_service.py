"""
YouTube video scraping service using scrapetube.

Fetches latest AI-related videos from YouTube search results
without requiring any API key.
"""

import scrapetube
from typing import Optional


class YouTubeService:
    """Scrapes YouTube for AI-related videos."""

    def search_videos(
        self,
        query: str = "AI news",
        limit: int = 10,
        sort_by: str = "upload_date",
    ) -> list[dict]:
        """
        Search YouTube for videos matching a query.

        Args:
            query: Search term
            limit: Max number of videos to return
            sort_by: Sort order — "relevance", "upload_date", "view_count"

        Returns:
            List of video dicts with title, url, channel, thumbnail, etc.
        """
        try:
            videos = scrapetube.get_search(
                query=query,
                limit=limit,
                sort_by=sort_by,
            )

            results = []
            for video in videos:
                title = video.get("title", {})
                if isinstance(title, dict):
                    title_text = title.get("runs", [{}])[0].get("text", "")
                else:
                    title_text = str(title)

                channel = video.get("ownerText", {})
                if isinstance(channel, dict):
                    channel_name = channel.get("runs", [{}])[0].get("text", "")
                else:
                    channel_name = str(channel)

                video_id = video.get("videoId", "")
                view_count_text = ""
                view_count_obj = video.get("viewCountText", {})
                if isinstance(view_count_obj, dict):
                    view_count_text = view_count_obj.get("simpleText", "")

                published_text = ""
                published_obj = video.get("publishedTimeText", {})
                if isinstance(published_obj, dict):
                    published_text = published_obj.get("simpleText", "")

                thumbnail_url = ""
                thumbnails = video.get("thumbnail", {}).get("thumbnails", [])
                if thumbnails:
                    thumbnail_url = thumbnails[-1].get("url", "")

                length_text = ""
                length_obj = video.get("lengthText", {})
                if isinstance(length_obj, dict):
                    length_text = length_obj.get("simpleText", "")

                results.append({
                    "video_id": video_id,
                    "title": title_text,
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "channel": channel_name,
                    "views": view_count_text,
                    "published": published_text,
                    "thumbnail": thumbnail_url,
                    "duration": length_text,
                })

            return results

        except Exception as e:
            print(f"[YOUTUBE] Search failed: {e}")
            return []


# Singleton instance
youtube_service = YouTubeService()
