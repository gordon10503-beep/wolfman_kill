from urllib.parse import parse_qs, urlparse
from xml.etree import ElementTree
from fastapi.testclient import TestClient
from backend.app import create_app


def test_invitation_qr_is_host_only_and_tracks_invite_rotation(tmp_path):
    with TestClient(create_app(tmp_path/'qr.db'),base_url='https://moonfall.example') as c:
        created=c.post('/api/games',json={'counts':{'wolf':1,'seer':1,'witch':1,'hunter':1,'villager':2}}).json()
        path='/api/games/'+created['id'];host={'Authorization':'Bearer '+created['host_token']};viewer={'Authorization':'Bearer '+created['viewer_token']}
        invite=c.post(path+'/room',headers=host,json={'command':'invite'}).json()['invite']
        endpoint=path+'/invite-qr';body={'invite':invite}
        assert c.post(endpoint,json=body).status_code==401
        assert c.post(endpoint,headers=viewer,json=body).status_code==403
        guest=c.post(path+'/join',json={'invite':invite,'name':'QR guest'}).json()
        assert c.post(endpoint,headers={'Authorization':'Bearer '+guest['player_token']},json=body).status_code==403
        response=c.post(endpoint,headers=host,json=body)
        assert response.status_code==200 and response.headers['cache-control']=='no-store'
        result=response.json();url=urlparse(result['url']);args=parse_qs(url.fragment)
        assert url.scheme=='https' and url.netloc=='moonfall.example'
        assert args=={'join':[created['id']],'invite':[invite],'seats':['6'],'hostseat':['1']}
        assert created['host_token'] not in result['url'] and created['viewer_token'] not in result['url']
        svg=ElementTree.fromstring(result['svg'])
        assert svg.tag=='{http://www.w3.org/2000/svg}svg' and svg.find('{http://www.w3.org/2000/svg}path') is not None
        fresh=c.post(path+'/room',headers=host,json={'command':'invite'}).json()['invite']
        assert c.post(endpoint,headers=host,json=body).status_code==403
        renewed=c.post(endpoint,headers=host,json={'invite':fresh}).json()
        assert renewed['svg']!=result['svg'] and parse_qs(urlparse(renewed['url']).fragment)['invite']==[fresh]
        other=c.post('/api/games',json={'counts':{'wolf':1,'seer':1,'witch':1,'hunter':1,'villager':2}}).json()
        assert c.post('/api/games/'+other['id']+'/invite-qr',headers=host,json={'invite':fresh}).status_code==403
