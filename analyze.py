''' Some basic stats '''

import os
import re
import json
import nltk
import string
from nltk.collocations import *
from collections import defaultdict

# Read in all seasons into season by episode dict of lists
def read_seasons():
	seasons = {}
	for x in range(1, 8):
		season = 'season' + str(x)
		seasons[season] = []

		d = './data/s' + str(x) + '/'
		fs = os.listdir(d)

		for f in fs:
			raw_lines = open(d + f).read().splitlines()
			lines = filter(lambda l: len(l.strip()) > 0, raw_lines)
			seasons[season].append(lines)

	return seasons


# Regex identifying a character name
character = re.compile(r'^(\w+):')
character_up = re.compile(r'^(\W+)$')
parenthetical = re.compile(r'\(.*\)')
punctuation = string.punctuation

# There are several ways of identifying who is speaking
# Currently only dealing with Buffy: <line> constructs
# TODO: fix character_up for season 7
# TODO: A few episodes contains lines like BUFFYhere is her line
def character_in_line(line):
	c = character.search(line.strip())
	if c:
		return c.group(1).lower()

def remove_actions(line):
	actions = parenthetical.findall(line)
	for action in actions:
		line = line.replace(action, ' ')
	return line

def remove_punctuation(line):
	for p in punctuation:
		line = line.replace(p, ' ')
	return line

# Omit parenthetical phrases since these aren't dialogue
# ex: Buffy:  I'm gonna kill them all. (turns to her task)
def get_line(episode, i):
	line = episode[i].split(':')[1]
	currIndex = i + 1
	while len(episode[currIndex]) > 1:
		line += episode[currIndex]
		currIndex += 1
	line = remove_punctuation(remove_actions(line))
	return ' '.join(line.split())

def get_lines_in_episode(episode_path):
	episode = open(episode_path).read().splitlines()
	for i, line in enumerate(episode):
		character = character_in_line(line)
		if character and len(episode[i + 1]) > 0:
			yield get_line(episode, i)

bigram_measures = nltk.collocations.BigramAssocMeasures()
trigram_measures = nltk.collocations.TrigramAssocMeasures()

def get_collocations(dialogue):
	biFinder = BigramCollocationFinder.from_words(dialogue)
	triFinder = TrigramCollocationFinder.from_words(dialogue)
	biFinder.apply_freq_filter(1)
	triFinder.apply_freq_filter(1)
	return biFinder.nbest(bigram_measures.pmi, 20), triFinder.nbest(trigram_measures.pmi, 20)

def get_collocations_for_season(season):
	dialogue = ''
	d = './data/s' + str(season) + '/'
	fs = os.listdir(d)
	for f in fs:
		for line in get_lines_in_episode(d + f):
			dialogue += ' ' + line
	biCollocations, triCollocations = get_collocations(dialogue.split())

	print 'top 20 bigram collocations by point-wise mutual information:'
	for colloc in biCollocations:
		print '\t',  ' '.join(list(colloc))
	print
	print 'top 20 trigram collocations by point-wise mutual information:'
	for colloc in triCollocations:
		print '\t', ' '.join(list(colloc))

get_collocations_for_season(1)

# Distribution of characters in each season, by # of lines spoken
def character_line_distribution():
	seasons = read_seasons()

	characters = {}
	for season, episodes in seasons.iteritems():
		characters[season] = defaultdict(int)

		for i, episode in enumerate(episodes):

			for j, line in enumerate(episode):
				character = character_in_line(line)
				if character:
					print season, i, character, get_line(episode, j)
					print
					characters[season][character] += 1

	# test = sorted(characters['season7'].items(), key=lambda t: t[1], reverse=True)

	# Save to json
	json.dump(characters, open('character_counts_by_season.json', 'w'))





