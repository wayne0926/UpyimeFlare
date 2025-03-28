const pageConfig = {
  "title": "Ethan's Status Page",
  "links": [
    {
      "link": "/config",
      "label": "Config",
      "highlight": true
    },
    {
      "link": "https://github.com/lyc8503",
      "label": "GitHub"
    },
    {
      "link": "https://blog.lyc8503.net/",
      "label": "Blog"
    },
    {
      "link": "mailto:me@lyc8503.net",
      "label": "Email Me",
      "highlight": true
    }
  ],
  "group": {
    "🌐 Public (example group name)": [
      "foo_monitor",
      "bar_monitor",
      "more monitor ids..."
    ],
    "🔐 Private": [
      "test_tcp_monitor"
    ]
  }
}

const workerConfig = {
  "kvWriteCooldownMinutes": 3,
  "monitors": [
    {
      "id": "foo_monitor",
      "name": "My API Monitor",
      "method": "POST",
      "target": "https://example.com",
      "tooltip": "This is a tooltip for this monitor",
      "statusPageLink": "https://example.com",
      "hideLatencyChart": false,
      "expectedCodes": [
        200
      ],
      "timeout": 10000,
      "headers": {
        "User-Agent": "Uptimeflare",
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      },
      "body": "Hello, world!",
      "responseKeyword": "success",
      "responseForbiddenKeyword": "bad gateway",
      "checkLocationWorkerRoute": "https://xxx.example.com"
    },
    {
      "id": "test_tcp_monitor",
      "name": "Example TCP Monitor",
      "method": "TCP_PING",
      "target": "1.2.3.4:22",
      "tooltip": "My production server SSH",
      "statusPageLink": "https://example.com",
      "timeout": 5000
    }
  ],
  "notification": {
    "appriseApiServer": "https://apprise.example.com/notify",
    "recipientUrl": "tgram://bottoken/ChatID",
    "timeZone": "Asia/Shanghai",
    "gracePeriod": 5
  },
  "callbacks": {}
}

export { pageConfig, workerConfig }