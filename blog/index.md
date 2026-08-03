---
layout: default
title: Blog
---

# Blog

<ul class="post-list">
{% for post in site.posts %}
  <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a> — {{ post.date | date: "%B %d, %Y" }}</li>
{% endfor %}
</ul>
