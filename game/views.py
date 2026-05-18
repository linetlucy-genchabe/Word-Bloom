import random
import string
import uuid
import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .words_data import PUZZLE_WORDS, LEVEL_CONFIG

# In-memory room store
rooms = {}


def pick_puzzle(level):
    return random.choice(PUZZLE_WORDS.get(level, PUZZLE_WORDS["easy"]))


def make_room_code():
    return ''.join(random.choices(string.ascii_uppercase, k=4))


# ── Pages ─────────────────────────────────────────────────────────────────────
def index(request):
    return render(request, 'game/index.html')

def solo(request):
    return render(request, 'game/solo.html', {'levels': LEVEL_CONFIG})

def lobby(request):
    return render(request, 'game/lobby.html')

def room(request, code):
    if code not in rooms:
        return render(request, 'game/error.html', {'msg': 'Room not found.'})
    return render(request, 'game/room.html', {'code': code, 'levels': LEVEL_CONFIG})

def offline(request):
    return render(request, 'game/offline.html')


# ── Solo API ──────────────────────────────────────────────────────────────────
@csrf_exempt
def api_solo_start(request):
    data = json.loads(request.body)
    level = data.get('level', 'easy')
    puzzle = pick_puzzle(level)
    shuffled = list(puzzle['letters'])
    random.shuffle(shuffled)
    # Store only serialisable data in session (word_set is a set — convert to list)
    request.session['solo'] = {
        'letters': puzzle['letters'],
        'level': level,
        'found': [],
        'score': 0,
        'word_set': list(puzzle['word_set']),  # stored as list, checked as set
        'count': puzzle['count'],
    }
    return JsonResponse({
        'letters': shuffled,
        'count': puzzle['count'],
        'time': LEVEL_CONFIG[level]['time'],
        'level': LEVEL_CONFIG[level]['label'],
        'min_len': LEVEL_CONFIG[level]['min_len'],
    })


@csrf_exempt
def api_solo_shuffle(request):
    solo = request.session.get('solo')
    if not solo:
        return JsonResponse({'error': 'No active game'}, status=400)
    letters = list(solo['letters'])
    random.shuffle(letters)
    return JsonResponse({'letters': letters})


@csrf_exempt
def api_solo_submit(request):
    data = json.loads(request.body)
    word = data.get('word', '').upper().strip()
    solo = request.session.get('solo')
    if not solo:
        return JsonResponse({'error': 'No active game'}, status=400)
    min_len = LEVEL_CONFIG[solo['level']]['min_len']
    word_set = set(solo['word_set'])

    if len(word) < min_len:
        return JsonResponse({'status': 'short', 'msg': f'Min {min_len} letters'})
    if word in [w.upper() for w in solo['found']]:
        return JsonResponse({'status': 'duplicate', 'msg': 'Already found!'})
    if word not in word_set:
        return JsonResponse({'status': 'wrong', 'msg': 'Not a valid word'})

    bonus = len(word) == len(solo['letters'])
    pts = len(word) * (2 if bonus else 1)
    solo['found'].append(word)
    solo['score'] += pts
    request.session['solo'] = solo
    request.session.modified = True
    return JsonResponse({
        'status': 'correct',
        'word': word,
        'score': solo['score'],
        'bonus': bonus,
        'found': solo['found'],
    })


@csrf_exempt
def api_solo_end(request):
    solo = request.session.get('solo', {})
    return JsonResponse({
        'found': solo.get('found', []),
        'score': solo.get('score', 0),
        'all_words': sorted(solo.get('word_set', [])),
        'total': solo.get('count', 0),
    })


# ── Multiplayer API ───────────────────────────────────────────────────────────
@csrf_exempt
def api_room_create(request):
    data = json.loads(request.body)
    name = data.get('name', 'Player').strip() or 'Player'
    code = make_room_code()
    while code in rooms:
        code = make_room_code()
    player_id = str(uuid.uuid4())
    rooms[code] = {
        'host': player_id,
        'players': {player_id: {'name': name, 'score': 0, 'words': []}},
        'state': 'waiting',
        'puzzle': None,
        'level': 'easy',
        'shuffled': [],
    }
    return JsonResponse({'code': code, 'player_id': player_id})


@csrf_exempt
def api_room_join(request):
    data = json.loads(request.body)
    code = data.get('code', '').upper().strip()
    name = data.get('name', 'Player').strip() or 'Player'
    if code not in rooms:
        return JsonResponse({'error': 'Room not found'}, status=404)
    room_data = rooms[code]
    if room_data['state'] != 'waiting':
        return JsonResponse({'error': 'Game already started'}, status=400)
    player_id = str(uuid.uuid4())
    room_data['players'][player_id] = {'name': name, 'score': 0, 'words': []}
    return JsonResponse({'code': code, 'player_id': player_id,
        'players': [p['name'] for p in room_data['players'].values()]})


@csrf_exempt
def api_room_start(request):
    data = json.loads(request.body)
    code = data.get('code')
    player_id = data.get('player_id')
    level = data.get('level', 'easy')
    if code not in rooms:
        return JsonResponse({'error': 'Room not found'}, status=404)
    room_data = rooms[code]
    if room_data['host'] != player_id:
        return JsonResponse({'error': 'Only host can start'}, status=403)
    puzzle = pick_puzzle(level)
    shuffled = list(puzzle['letters'])
    random.shuffle(shuffled)
    room_data.update({
        'state': 'playing',
        'level': level,
        'puzzle': {
            'letters': puzzle['letters'],
            'word_set': puzzle['word_set'],
            'count': puzzle['count'],
        },
        'shuffled': shuffled,
    })
    for pid in room_data['players']:
        room_data['players'][pid].update({'score': 0, 'words': []})
    return JsonResponse({
        'letters': shuffled,
        'count': puzzle['count'],
        'time': LEVEL_CONFIG[level]['time'],
        'level': LEVEL_CONFIG[level]['label'],
        'min_len': LEVEL_CONFIG[level]['min_len'],
    })


@csrf_exempt
def api_room_shuffle(request):
    data = json.loads(request.body)
    code = data.get('code')
    if code not in rooms:
        return JsonResponse({'error': 'Room not found'}, status=404)
    letters = list(rooms[code]['puzzle']['letters'])
    random.shuffle(letters)
    rooms[code]['shuffled'] = letters
    return JsonResponse({'letters': letters})


@csrf_exempt
def api_room_submit(request):
    data = json.loads(request.body)
    code = data.get('code')
    player_id = data.get('player_id')
    word = data.get('word', '').upper().strip()
    if code not in rooms:
        return JsonResponse({'error': 'Room not found'}, status=404)
    room_data = rooms[code]
    if room_data['state'] != 'playing':
        return JsonResponse({'status': 'error', 'msg': 'Game not active'})
    puzzle = room_data['puzzle']
    min_len = LEVEL_CONFIG[room_data['level']]['min_len']
    player = room_data['players'].get(player_id)
    if not player:
        return JsonResponse({'error': 'Player not found'}, status=404)
    if len(word) < min_len:
        return JsonResponse({'status': 'short', 'msg': f'Min {min_len} letters'})
    if word in [w.upper() for w in player['words']]:
        return JsonResponse({'status': 'duplicate', 'msg': 'You already found this!'})
    if word not in puzzle['word_set']:
        return JsonResponse({'status': 'wrong', 'msg': 'Not a valid word'})
    all_found = [w.upper() for p in room_data['players'].values() for w in p['words']]
    stolen = word in all_found
    bonus = len(word) == len(puzzle['letters'])
    pts = 0 if stolen else len(word) * (2 if bonus else 1)
    player['words'].append(word)
    player['score'] += pts
    return JsonResponse({
        'status': 'correct', 'word': word, 'score': player['score'],
        'stolen': stolen, 'bonus': bonus,
        'scoreboard': {pid: {'name': p['name'], 'score': p['score'], 'count': len(p['words'])}
                       for pid, p in room_data['players'].items()},
    })


def api_room_state(request):
    code = request.GET.get('code')
    if code not in rooms:
        return JsonResponse({'error': 'Room not found'}, status=404)
    room_data = rooms[code]
    return JsonResponse({
        'state': room_data['state'],
        'players': {pid: {'name': p['name'], 'score': p['score'], 'count': len(p['words'])}
                    for pid, p in room_data['players'].items()},
        'host': room_data['host'],
        'letters': room_data.get('shuffled', []),
        'level': room_data.get('level', 'easy'),
        'puzzle_count': room_data['puzzle']['count'] if room_data['puzzle'] else 0,
    })


@csrf_exempt
def api_room_end(request):
    data = json.loads(request.body)
    code = data.get('code')
    if code not in rooms:
        return JsonResponse({'error': 'Room not found'}, status=404)
    room_data = rooms[code]
    room_data['state'] = 'ended'
    puzzle = room_data['puzzle']
    scores = sorted(room_data['players'].items(), key=lambda x: x[1]['score'], reverse=True)
    return JsonResponse({
        'results': [{'name': p['name'], 'score': p['score'],
                     'words': p['words'], 'count': len(p['words'])} for _, p in scores],
        'all_words': sorted(puzzle['word_set']),
        'total': puzzle['count'],
    })