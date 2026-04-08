---
layout: default
title: Pics
---

# Pics



{% assign all = site.static_files | where_exp: "f", "f.path contains '/assets/pics/'" %}
{% assign pics = "" | split: "" %}
{% for f in all %}
  {% assign ext = f.extname | downcase %}
  {% if ext == ".jpg" or ext == ".jpeg" or ext == ".png" or ext == ".webp" or ext == ".gif" %}
    {% assign pics = pics | push: f %}
  {% endif %}
{% endfor %}

{% if pics.size == 0 %}
  <p>No images found yet. Put some in <code>assets/pics/</code>.</p>
{% else %}
  <div class="pics-grid">
    {% for p in pics %}
      {% assign alt = p.name | split: "." | first | replace: "-", " " | replace: "_", " " %}
      <a href="{{ p.path | relative_url }}" target="_blank">
        <img src="{{ p.path | relative_url }}" alt="{{ alt | escape }}" loading="lazy" decoding="async">
      </a>
    {% endfor %}
  </div>
{% endif %}
