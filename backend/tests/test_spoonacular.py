from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.spoonacular import SpoonacularClient


@pytest.fixture
def mock_settings_key():
    with patch("app.services.spoonacular.settings") as mock_settings:
        mock_settings.SPOONACULAR_API_KEY = "test_key"
        yield


@pytest.fixture
def client(mock_settings_key):
    return SpoonacularClient()


@pytest.mark.asyncio
async def test_init_no_key():
    with patch("app.services.spoonacular.settings") as mock_settings:
        mock_settings.SPOONACULAR_API_KEY = None
        client = SpoonacularClient()
        assert client.api_key is None


@pytest.mark.asyncio
async def test_request_no_key_raises(client):
    client.api_key = None
    with pytest.raises(ValueError, match="Spoonacular API key is not set"):
        await client._request("GET", "/test")


@pytest.mark.asyncio
async def test_get_random_recipes_success(client):
    mock_response_data = {
        "recipes": [{"id": 1, "title": "Pasta"}, {"id": 2, "title": "Salad"}]
    }

    with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_request:
        # Create a MagicMock for the response object so methods like json() are synch
        mock_response = MagicMock()
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status.return_value = None

        mock_request.return_value = mock_response

        recipes = await client.get_random_recipes(number=2, tags=["vegetarian"])

        assert len(recipes) == 2
        assert recipes[0]["title"] == "Pasta"

        mock_request.assert_awaited_once()
        call_args = mock_request.call_args
        assert call_args[0] == ("GET", "https://api.spoonacular.com/recipes/random")
        assert call_args[1]["params"] == {"number": 2, "tags": "vegetarian"}
        assert call_args[1]["headers"]["x-api-key"] == "test_key"


@pytest.mark.asyncio
async def test_api_error_raises(client):
    with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_request:
        # Mocking raise_for_status to raise an exception
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Error", request=None, response=None
        )
        mock_request.return_value = mock_response

        with pytest.raises(httpx.HTTPStatusError):
            await client.get_random_recipes()


@pytest.mark.asyncio
async def test_search_recipes_success(client):
    mock_response_data = {
        "results": [
            {"id": 101, "title": "Chicken Soup"},
            {"id": 102, "title": "Veggie Stir Fry"},
        ]
    }

    with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_request:
        mock_response = MagicMock()
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status.return_value = None

        mock_request.return_value = mock_response

        # Test with various parameters
        results = await client.search_recipes(
            query="soup",
            number=2,
            min_calories=100,
            max_calories=500,
            diet="vegetarian",
            intolerances=["gluten", "dairy"],
        )

        assert len(results) == 2
        assert results[0]["title"] == "Chicken Soup"

        mock_request.assert_awaited_once()
        call_args = mock_request.call_args
        assert call_args[0] == (
            "GET",
            "https://api.spoonacular.com/recipes/complexSearch",
        )
        params = call_args[1]["params"]
        assert params["query"] == "soup"
        assert params["number"] == 2
        assert params["minCalories"] == 100
        assert params["maxCalories"] == 500
        assert params["diet"] == "vegetarian"
        assert params["intolerances"] == "gluten,dairy"
        assert params["addRecipeInformation"] is True
        assert params["addRecipeNutrition"] is True
        assert params["instructionsRequired"] is True
        assert params["fillIngredients"] is True
        assert call_args[1]["headers"]["x-api-key"] == "test_key"
