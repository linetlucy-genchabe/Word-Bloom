from django.urls import path
from . import views

urlpatterns = [
    # Pages
    path('',                 views.index,   name='index'),
    path('solo/',            views.solo,    name='solo'),
    path('lobby/',           views.lobby,   name='lobby'),
    path('room/<str:code>/', views.room,    name='room'),
    path('offline/',         views.offline, name='offline'),

    # Solo API
    path('api/solo/start/',   views.api_solo_start,   name='api_solo_start'),
    path('api/solo/shuffle/', views.api_solo_shuffle, name='api_solo_shuffle'),
    path('api/solo/submit/',  views.api_solo_submit,  name='api_solo_submit'),
    path('api/solo/end/',     views.api_solo_end,     name='api_solo_end'),

    # Multiplayer API
    path('api/room/create/',  views.api_room_create,  name='api_room_create'),
    path('api/room/join/',    views.api_room_join,    name='api_room_join'),
    path('api/room/start/',   views.api_room_start,   name='api_room_start'),
    path('api/room/shuffle/', views.api_room_shuffle, name='api_room_shuffle'),
    path('api/room/submit/',  views.api_room_submit,  name='api_room_submit'),
    path('api/room/state/',   views.api_room_state,   name='api_room_state'),
    path('api/room/end/',     views.api_room_end,     name='api_room_end'),
]