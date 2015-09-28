''' Some basic stats ''' 

import os
import re
import json
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

# There are several ways of identifying who is speaking 
# TODO: fix character_up for season 7 
# TODO: A few episodes contains lines like BUFFYhere is her line 
def character_in_line(line):
	# Buffy: <line>  
	c = character.search(line.strip())
	if c: 
		return c.group(1).lower()
	# BUFFY
	# else:
	# 	c = character_up.search(line)
	# 	if c:
	# 		return c.group(1).lower()
		

# Distribution of characters in each season, by # of lines spoken 
def character_line_distribution():
	seasons = read_seasons()

	characters = {}
	for season, episodes in seasons.iteritems():
		characters[season] = defaultdict(int)
		
		for episode in episodes: 

			for line in episode:
				character = character_in_line(line)
				if character:
					# print character, line 
					# print
					characters[season][character] += 1

	test = sorted(characters['season7'].items(), key=lambda t: t[1], reverse=True)
	# for t in test:
	# 	print t[0], t[1]

	# Save to json 
	json.dump(characters, open('character_counts_by_season.json', 'w'))




character_line_distribution()




