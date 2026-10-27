"""Local GeoNames autocomplete for countries, cities and towns."""
from functools import lru_cache
from bisect import bisect_left
from heapq import nsmallest
import unicodedata
import geonamescache


def normalize(value):
    return ''.join(character for character in unicodedata.normalize('NFKD', value.casefold())
                   if not unicodedata.combining(character)).strip()


@lru_cache(maxsize=1)
def place_index():
    cache = geonamescache.GeonamesCache(min_city_population=15000)
    countries = cache.get_countries()
    records = []
    for code, country in countries.items():
        name = country['name']
        records.append((normalize(name), country.get('population', 0), {
            'id': f'country-{code}', 'name': name, 'label': name, 'country': name, 'kind': 'country'
        }))
    for city in cache.get_cities().values():
        country = countries.get(city['countrycode'], {}).get('name', city['countrycode'])
        name = city['name']
        records.append((normalize(name), city.get('population', 0), {
            'id': f"city-{city['geonameid']}", 'name': name, 'label': f'{name}, {country}',
            'country': country, 'kind': 'place'
        }))
    records.sort(key=lambda record: record[0])
    return records, [record[0] for record in records]


def suggest_destinations(query):
    return _suggest_destinations(normalize(query))


@lru_cache(maxsize=256)
def _suggest_destinations(query):
    if not query:
        return []
    records, names = place_index()
    start = bisect_left(names, query)
    end = start
    while end < len(names) and names[end].startswith(query):
        end += 1
    matches = records[start:end]
    rank = lambda record: (record[0] != query, -record[1], record[0], record[2]['id'])
    countries = nsmallest(3, (record for record in matches if record[2]['kind'] == 'country'), key=rank)
    places = nsmallest(10 - len(countries), (record for record in matches if record[2]['kind'] == 'place'), key=rank)
    return [record[2] for record in sorted(countries + places, key=lambda record: (record[0] != query, record[2]['kind'] != 'country', -record[1], record[0]))]
