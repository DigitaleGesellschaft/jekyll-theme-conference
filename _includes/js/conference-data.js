let rooms = {
    {%- for r in site.data.program -%}
        {%- assign room = site.rooms | where: 'name', r.room | first -%}
        {%- if room.live -%}

            {%- assign t = r.talks | first -%}
            {%- include partials/get_talk_time.html -%}
            {%- assign time_start = talk_start -%}
            {%- assign time_end = talk_end -%}
            {%- include partials/get_timestamp.html -%}

            {%- assign offset_start = site.conference.live.streaming.start_early | default: 0 -%}
            {%- assign room_ts_start = offset_start | times: -60 | plus: timestamp_start -%}

            {%- assign t = r.talks | last -%}
            {%- include partials/get_talk_time.html -%}
            {%- assign time_start = talk_start -%}
            {%- assign time_end = talk_end -%}
            {%- include partials/get_timestamp.html -%}

            {%- assign offset_end = site.conference.live.streaming.end_late | default: 0 -%}
            {%- assign room_ts_end = offset_end | times: 60 | plus: timestamp_end -%}

            "{{ room.name }}": {
                "id": {{ forloop.index }},
                "name": "{{ room.name }}",
                "href": "{{ room.live }}",
                "start": {{ room_ts_start }},
                "end": {{ room_ts_end }}
            },
        {%- endif -%}
    {%- endfor -%}
};

let speakers = {
    {%- for speaker in site.speakers -%}
        "{{ speaker.name }}" : {
            {%- if site.conference.speakers.show_firstname -%}
                "name": "{{ speaker.first_name | append: ' ' | append: speaker.last_name }}",
            {%- else -%}
                "name": "{{ speaker.first_name | slice: 0 | append : '. ' | append: speaker.last_name }}",
            {%- endif -%}
            {%- if speaker.hide -%}
                "href": "",
            {%- else -%}
                "href": "{{ speaker.url | prepend: site.baseurl }}",
            {%- endif -%}
        },
    {%- endfor -%}
};

let talks = {
    {%- for r in site.data.program -%}
        {%- assign room = site.rooms | where: 'name', r.room | first -%}
        {%- if room.live -%}
            "{{ room.name | replace: '"', '\"' }}": [
                {%- for t in r.talks -%}
                    {%- assign talk = site.talks | where: 'name', t.name | first -%}
                    {
                        "name": "{{ talk.name | replace: '"', '\"' }}",

                        {%- unless talk.hide -%}
                            "href": "{{ talk.url | prepend: site.baseurl }}",
                        {%- else -%}
                            "href": "",
                        {%- endunless -%}

                        {%- include partials/get_main_category.html -%}
                        "color": "{{ main_cat_color }}",

                        "speakers": [
                            {%- for speaker_name in talk.speakers -%}
                                "{{ speaker_name}}",
                            {%- endfor -%}
                        ],

                        {%- assign time_start = t.time_start -%}
                        {%- assign time_end = t.time_end -%}
                        {%- include partials/get_timestamp.html -%}
                        "start": {{ timestamp_start }},
                        "end": {{ timestamp_end }}
                    },
                {%- endfor -%}
            ],
        {%- endif -%}
    {%- endfor -%}
};
