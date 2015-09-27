''' Script to pull the transcripts of all episodes of BTVS ''' 

import requests
from bs4 import BeautifulSoup

base_url = "http://www.buffyworld.com/buffy/transcripts/"

season_starts = [1, 13, 35, 57, 79, 101, 123]
curr_season = 1

# There are 144 episodes 
for i in range(1, 145):
	# Get the season we're currently pulling
	if curr_season < 7 and i >= season_starts[curr_season]:
		curr_season += 1		

	print 'Season', curr_season, 'episode', i

	# Format url 
	n = str(i)
	if i < 10:
		n = '00' + n
	elif i < 100:
		n = '0' + n

	url = base_url + n + "_tran.html"

	# Download data
	req = requests.get(url)
	soup = BeautifulSoup(req.text)

	# Get just the text 
	texts = soup.findAll(text=True)

	# Save to proper dir 
	f = open('data/s' + str(curr_season) + '/e' + str(i) + '.txt', 'w')
	for text in texts:
		f.write(text.encode('utf8'))
	f.close()


	